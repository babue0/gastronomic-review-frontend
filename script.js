const API_URL = "http://localhost:8080";

// Elementos
const authSection = document.getElementById("authSection");
const feedSection = document.getElementById("feedSection");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const btnLogout = document.getElementById("btnLogout"); // 👇 Adicione esta linha!

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
  // Apaga a "Pulseira VIP"
  localStorage.removeItem("michelinToken");

  // Troca as telas
  authSection.classList.remove("d-none");
  feedSection.classList.add("d-none");

  // 👇 Esconde o botão de sair da Navbar
  btnLogout.classList.add("d-none");
}

function checkAuth() {
  if (localStorage.getItem("michelinToken")) showFeed();
}

function showFeed() {
  // Troca as telas
  authSection.classList.add("d-none");
  feedSection.classList.remove("d-none");

  // 👇 Mostra o botão de sair lá no topo direito
  btnLogout.classList.remove("d-none");

  loadFeed();
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

async function loadFeed() {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  const response = await fetch(`${API_URL}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();

  const reviews = await response.json();
  const feedContainer = document.getElementById("feedContainer");
  feedContainer.innerHTML = "";

  reviews.forEach((review) => {
    console.log("Post em texto puro:", JSON.stringify(review));
    const starsHtml = "⭐".repeat(review.rating);
    const imageUrl = `${API_URL}/uploads/${review.imagePath}`;

    // 👇 A correção: passamos o review.id garantindo que seja um número pro JS
    let deleteBtnHtml = "";
    if (review.user.email === loggedEmail) {
      deleteBtnHtml = `
                <button class="btn-delete ms-2" onclick="confirmDelete(${Number(review.Id)})">
                    Excluir
                </button>
            `;
    }

    // Lógica do Coração (Like)
    const hasLiked =
      review.likedByEmails && review.likedByEmails.includes(loggedEmail);
    const heartIcon = hasLiked ? "❤️" : "🤍";
    const likeClass = hasLiked ? "liked" : "";

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
                            <p class="author-text mb-0">Por <strong>${review.user.name}</strong></p>
                            
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

checkAuth();
