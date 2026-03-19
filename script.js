const API_URL = "http://localhost:8080";

// Elementos
const authSection = document.getElementById("authSection");
const feedSection = document.getElementById("feedSection");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const btnLogout = document.getElementById("btnLogout");
const profileSection = document.getElementById("profileSection");
const btnProfile = document.getElementById("btnProfile");

// Alternar entre Login e Cadastro
function toggleAuth() {
  loginBox.classList.toggle("d-none");
  registerBox.classList.toggle("d-none");
}

// ==========================================
// 1. LOGIN E CADASTRO
// ==========================================

document
  .getElementById("formRegister")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("regName").value,
      email: document.getElementById("regEmail").value,
      password: document.getElementById("regPassword").value,
    };

    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      Swal.fire("Sucesso!", "Conta criada. Faça o login!", "success");
      document.getElementById("formRegister").reset();
      toggleAuth();
    } else {
      Swal.fire("Erro", "E-mail já cadastrado.", "error");
    }
  });

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    const token = await res.text();
    localStorage.setItem("michelinToken", token);
    showFeed();
  } else {
    Swal.fire("Acesso Negado", "Senha incorreta.", "error");
  }
});

function logout() {
  localStorage.removeItem("michelinToken");
  authSection.classList.remove("d-none");
  feedSection.classList.add("d-none");
  profileSection.classList.add("d-none"); // Esconde perfil
  btnLogout.classList.add("d-none");
  btnProfile.classList.add("d-none"); // Esconde botão
}

function checkAuth() {
  if (localStorage.getItem("michelinToken")) showFeed();
}

function showFeed() {
  authSection.classList.add("d-none");
  profileSection.classList.add("d-none"); // Esconde perfil
  feedSection.classList.remove("d-none"); // Mostra feed
  btnLogout.classList.remove("d-none");
  btnProfile.classList.remove("d-none");
  loadFeed();
}

function showProfile() {
  authSection.classList.add("d-none");
  feedSection.classList.add("d-none"); // Esconde feed
  profileSection.classList.remove("d-none"); // Mostra perfil
  loadProfile(); // Chama a nova função!
}

// ==========================================
// 2. ENVIAR POST (COM FOTO)
// ==========================================

document.getElementById("formReview").addEventListener("submit", async (e) => {
  e.preventDefault();

  // 🔴 O SEGREDO ESTÁ AQUI: FormData embala a foto e o texto juntos!
  const formData = new FormData();
  formData.append(
    "restaurantName",
    document.getElementById("restaurantName").value,
  );
  formData.append("category", document.getElementById("category").value);
  formData.append("rating", document.getElementById("rating").value);
  formData.append("comment", document.getElementById("comment").value);

  // Pega o arquivo de imagem do input
  const imageFile = document.getElementById("reviewImage").files[0];
  formData.append("image", imageFile);

  const token = localStorage.getItem("michelinToken");

  try {
    const response = await fetch(`${API_URL}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NOTA: Não colocamos 'Content-Type' aqui.
        // O navegador faz isso automaticamente quando usamos FormData!
      },
      body: formData,
    });

    if (response.ok) {
      Swal.fire("Postado!", "Sua avaliação já está no feed.", "success");
      document.getElementById("formReview").reset();
      loadFeed(); // Atualiza a tela
    } else {
      Swal.fire("Ops", "Erro ao salvar o post.", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
  }
});

// ==========================================
// 3. CARREGAR O FEED
// ==========================================

function getLoggedEmail() {
  const token = localStorage.getItem("michelinToken");
  if (!token) return null;
  try {
    // O JWT é dividido em 3 partes por um ponto (.). O "meio" dele (índice 1) tem os dados!
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub; // 'sub' é onde o Spring Security guarda o e-mail do usuário
  } catch (e) {
    return null;
  }
}

async function loadFeed(category = "", searchName = "") {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  // Monta a URL inteligente dependendo do que o usuário quer
  let url = `${API_URL}/reviews`;
  if (category) {
    url += `?category=${category}`;
  } else if (searchName) {
    url += `?restaurantName=${searchName}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();

  const reviews = await response.json();
  const feedContainer = document.getElementById("feedContainer");
  feedContainer.innerHTML = "";

  // Mensagem caso não encontre nenhum restaurante com aquele nome
  if (reviews.length === 0) {
    feedContainer.innerHTML = `<div class="col-12"><p class="text-muted text-center mt-4">Nenhuma avaliação encontrada.</p></div>`;
    return;
  }

  reviews.forEach((review) => {
    console.log("Post em texto puro:", JSON.stringify(review));
    const starsHtml = "⭐".repeat(review.rating);
    const imageUrl = `${API_URL}/uploads/${review.imagePath}`;

    // 👇 A correção: passamos o review.id garantindo que seja um número pro JS
    let deleteBtnHtml = "";
    let authorHtml = "";

    if (review.user.email === loggedEmail) {
      // Se o post for SEU: Mostra "Minha postagem" em destaque e o botão de lixeira
      authorHtml = `<p class="author-text mb-0 fw-bold" style="color: var(--primary-color);">Minha postagem</p>`;

      deleteBtnHtml = `
                <button class="btn-delete ms-2" onclick="confirmDelete(${Number(review.Id)})">
                    Excluir
                </button>
            `;
    } else {
      // Se o post for DE OUTRA PESSOA: Mostra o nome dela clicável para visitar o perfil
      authorHtml = `
                <p class="author-text mb-0" style="cursor: pointer; transition: 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1" onclick="viewUserProfile(${review.user.id}, '${review.user.name}')">
                    Por <strong style="color: var(--primary-color); text-decoration: underline;">${review.user.name}</strong>
                </p>`;
    }

    // Lógica do Coração (Like)
    const hasLiked =
      review.likedByEmails && review.likedByEmails.includes(loggedEmail);
    const heartIcon = hasLiked ? "❤️" : "🤍";
    const likeClass = hasLiked ? "liked" : "";

    // Montagem do cartão do Feed
    feedContainer.innerHTML += `
            <div class="col-md-6 mb-4">
                <div class="review-card">
                    <div class="img-container">
                        <span class="category-badge">${review.category}</span>
                        <img src="${imageUrl}" class="review-img" alt="Foto do prato">
                    </div>
                    <div class="card-body-custom">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="fw-bold mb-0 text-truncate pe-2">${review.restaurantName}</h5>
                            <span class="stars flex-shrink-0">${starsHtml}</span>
                        </div>
                        <p class="text-muted small mb-3 flex-grow-1">"${review.comment}"</p>
                        
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                            
                            ${authorHtml}
                            
                            <div class="d-flex align-items-center">
                                <button class="btn-like ${likeClass}" onclick="toggleLike(${Number(review.Id)})">
                                    ${heartIcon} <span class="ms-2">${review.likeCount}</span>
                                </button>
                                ${deleteBtnHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
}

// O Pop-up de confirmação do SweetAlert2
function confirmDelete(reviewId) {
  console.log("ID do post a ser deletado:", reviewId); // <-- Verifique o console do navegador

  if (!reviewId || isNaN(reviewId)) {
    Swal.fire("Erro!", "ID do post inválido.", "error");
    return;
  }

  Swal.fire({
    title: "Excluir avaliação?",
    text: "Você não poderá reverter isso depois!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, excluir!",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      const token = localStorage.getItem("michelinToken");

      const res = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        Swal.fire("Excluído!", "O post foi apagado com sucesso.", "success");
        loadFeed(); // Atualiza a tela automaticamente
      } else {
        // Se der erro, vamos mostrar o texto que o Java devolveu pra entender melhor!
        const errorText = await res.text();
        Swal.fire("Erro", errorText || "Não foi possível excluir.", "error");
      }
    }
  });
}

// Dispara quando a pessoa clica no coração
async function toggleLike(reviewId) {
  const token = localStorage.getItem("michelinToken");

  await fetch(`${API_URL}/reviews/${reviewId}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  loadFeed(); // Recarrega o feed para atualizar os corações e os números
}

function filterCategory(categoryName, clickedButton) {
  document.getElementById("searchInput").value = ""; // Limpa a pesquisa de texto

  // Lógica para pintar o botão selecionado
  if (clickedButton) {
    // 1. Pega todos os botões do filtro
    const allButtons = document.querySelectorAll("#categoryFilters button");

    // 2. Tira a cor sólida de todos e deixa só a borda
    allButtons.forEach((btn) => {
      btn.classList.remove("btn-dark");
      btn.classList.add("btn-outline-dark");
    });

    // 3. Pinta com cor sólida apenas o botão que foi clicado
    clickedButton.classList.remove("btn-outline-dark");
    clickedButton.classList.add("btn-dark");
  }

  loadFeed(categoryName, "");
}

// Disparado ao clicar no botão "Buscar"
function searchRestaurant() {
  const searchName = document.getElementById("searchInput").value;

  // Quando pesquisa por texto, a gente devolve a marcação visual para o botão "Todos"
  const allButtons = document.querySelectorAll("#categoryFilters button");
  allButtons.forEach((btn) => {
    btn.classList.remove("btn-dark");
    btn.classList.add("btn-outline-dark");
  });
  allButtons[0].classList.remove("btn-outline-dark");
  allButtons[0].classList.add("btn-dark");

  loadFeed("", searchName);
}

async function loadProfile() {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  const response = await fetch(`${API_URL}/reviews/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();

  const profileData = await response.json();

  // 1. Preenche as estatísticas coloridas
  document.getElementById("statTotal").innerText = profileData.totalReviews;
  document.getElementById("statAvg").innerText =
    profileData.averageRating.toFixed(1);
  document.getElementById("statFav").innerText = profileData.favoriteCategory;

  // 2. Preenche os cartões (igual ao feed, mas só com os seus!)
  const profileFeedContainer = document.getElementById("profileFeedContainer");
  profileFeedContainer.innerHTML = "";

  if (profileData.myReviews.length === 0) {
    profileFeedContainer.innerHTML =
      "<p class='text-muted'>Você ainda não avaliou nenhum lugar.</p>";
    return;
  }

  profileData.myReviews.forEach((review) => {
    const starsHtml = "⭐".repeat(review.rating);
    const imageUrl = `${API_URL}/uploads/${review.imagePath}`;

    const hasLiked =
      review.likedByEmails && review.likedByEmails.includes(loggedEmail);
    const heartIcon = hasLiked ? "❤️" : "🤍";
    const likeClass = hasLiked ? "liked" : "";

    profileFeedContainer.innerHTML += `
            <div class="col-md-4 mb-4"> <div class="review-card">
                    <div class="img-container">
                        <span class="category-badge">${review.category}</span>
                        <img src="${imageUrl}" class="review-img" alt="Foto" style="height: 180px;">
                    </div>
                    <div class="card-body-custom">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-bold mb-0 text-truncate pe-2">${review.restaurantName}</h6>
                            <span class="stars flex-shrink-0" style="font-size:0.9rem;">${starsHtml}</span>
                        </div>
                        <p class="text-muted small mb-3 text-truncate">"${review.comment}"</p>
                        
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                            <button class="btn-like ${likeClass}" onclick="toggleLike(${Number(review.Id)}); setTimeout(loadProfile, 300)">
                                ${heartIcon} <span class="ms-1">${review.likeCount}</span>
                            </button>
                            <button class="btn-delete" onclick="confirmDelete(${Number(review.Id)})">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
}

async function viewUserProfile(userId, userName) {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  // Troca as telas e altera o título grandão
  authSection.classList.add("d-none");
  feedSection.classList.add("d-none");
  profileSection.classList.remove("d-none");
  document.getElementById("profileTitle").innerText = `Perfil de ${userName}`;

  // Busca os dados da pessoa que foi clicada
  const response = await fetch(`${API_URL}/reviews/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();
  const profileData = await response.json();

  // Usa a função auxiliar para pintar os dados na tela
  renderProfileData(profileData, loggedEmail);
}

// A sua função loadProfile (Meu Perfil) atualizada para usar o mesmo padrão!
async function loadProfile() {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  // Garante que o título volta a ser "Meu Perfil"
  document.getElementById("profileTitle").innerText = "Meu Perfil";

  const response = await fetch(`${API_URL}/reviews/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();
  const profileData = await response.json();

  // Usa a função auxiliar para pintar os dados na tela
  renderProfileData(profileData, loggedEmail);
}

// A função que desenha os painéis e as fotos (Reaproveitada para Meu Perfil e Perfil dos Outros)
function renderProfileData(profileData, loggedEmail) {
  document.getElementById("statTotal").innerText = profileData.totalReviews;
  document.getElementById("statAvg").innerText =
    profileData.averageRating.toFixed(1);
  document.getElementById("statFav").innerText = profileData.favoriteCategory;

  const profileFeedContainer = document.getElementById("profileFeedContainer");
  profileFeedContainer.innerHTML = "";

  if (profileData.myReviews.length === 0) {
    profileFeedContainer.innerHTML =
      "<p class='text-muted'>Nenhuma avaliação encontrada.</p>";
    return;
  }

  profileData.myReviews.forEach((review) => {
    const starsHtml = "⭐".repeat(review.rating);
    const imageUrl = `${API_URL}/uploads/${review.imagePath}`;

    const hasLiked =
      review.likedByEmails && review.likedByEmails.includes(loggedEmail);
    const heartIcon = hasLiked ? "❤️" : "🤍";
    const likeClass = hasLiked ? "liked" : "";

    // O Botão de excluir só aparece se VOCÊ for o dono do post!
    let deleteBtnHtml = "";
    if (review.user.email === loggedEmail) {
      deleteBtnHtml = `<button class="btn-delete" onclick="confirmDelete(${Number(review.Id)})">🗑️</button>`;
    }

    profileFeedContainer.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="review-card">
                    <div class="img-container">
                        <span class="category-badge">${review.category}</span>
                        <img src="${imageUrl}" class="review-img" style="height: 180px;">
                    </div>
                    <div class="card-body-custom">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-bold mb-0 text-truncate pe-2">${review.restaurantName}</h6>
                            <span class="stars flex-shrink-0" style="font-size:0.9rem;">${starsHtml}</span>
                        </div>
                        <p class="text-muted small mb-3 text-truncate">"${review.comment}"</p>
                        
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                            <button class="btn-like ${likeClass}" onclick="toggleLike(${Number(review.Id)}); setTimeout(() => viewUserProfile(${review.user.id}, '${review.user.name}'), 300)">
                                ${heartIcon} <span class="ms-1">${review.likeCount}</span>
                            </button>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
}

checkAuth();
