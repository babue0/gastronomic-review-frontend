const API_URL = "http://localhost:8080";

const authSection = document.getElementById("authSection");
const feedSection = document.getElementById("feedSection");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const btnLogout = document.getElementById("btnLogout");
const profileSection = document.getElementById("profileSection");
const btnProfile = document.getElementById("btnProfile");

function toggleAuth() {
  loginBox.classList.toggle("d-none");
  registerBox.classList.toggle("d-none");
}

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
  profileSection.classList.add("d-none");
  btnLogout.classList.add("d-none");
  btnProfile.classList.add("d-none");
}

function checkAuth() {
  if (localStorage.getItem("michelinToken")) showFeed();
}

function showFeed() {
  authSection.classList.add("d-none");
  profileSection.classList.add("d-none");
  feedSection.classList.remove("d-none");
  btnLogout.classList.remove("d-none");
  btnProfile.classList.remove("d-none");
  loadFeed();
}

function showProfile() {
  authSection.classList.add("d-none");
  feedSection.classList.add("d-none");
  profileSection.classList.remove("d-none");
  loadProfile();
}

document.getElementById("formReview").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append(
    "restaurantName",
    document.getElementById("restaurantName").value,
  );
  formData.append("category", document.getElementById("category").value);
  formData.append("rating", document.getElementById("rating").value);
  formData.append("comment", document.getElementById("comment").value);

  const imageFile = document.getElementById("reviewImage").files[0];
  formData.append("image", imageFile);

  const token = localStorage.getItem("michelinToken");

  try {
    const response = await fetch(`${API_URL}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      Swal.fire("Postado!", "Sua avaliação já está no feed.", "success");
      document.getElementById("formReview").reset();
      loadFeed();
    } else {
      Swal.fire("Ops", "Erro ao salvar o post.", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
  }
});

function getLoggedEmail() {
  const token = localStorage.getItem("michelinToken");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch (e) {
    return null;
  }
}

async function loadFeed(category = "", searchName = "") {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

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

  if (reviews.length === 0) {
    feedContainer.innerHTML = `<div class="col-12"><p class="text-muted text-center mt-4">Nenhuma avaliação encontrada.</p></div>`;
    return;
  }

  reviews.forEach((review) => {
    console.log("Post em texto puro:", JSON.stringify(review));
    const starsHtml = "⭐".repeat(review.rating);
    const imageUrl = `${API_URL}/uploads/${review.imagePath}`;

    let deleteBtnHtml = "";
    let authorHtml = "";

    if (review.user.email === loggedEmail) {
      authorHtml = `<p class="author-text mb-0 fw-bold" style="color: var(--primary-color);">Minha postagem</p>`;

      deleteBtnHtml = `
                <button class="btn-delete ms-2" onclick="confirmDelete(${Number(review.Id)})">
                    Excluir
                </button>
            `;
    } else {
      authorHtml = `
                <p class="author-text mb-0" style="cursor: pointer; transition: 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1" onclick="viewUserProfile(${review.user.id}, '${review.user.name}')">
                    Por <strong style="color: var(--primary-color); text-decoration: underline;">${review.user.name}</strong>
                </p>`;
    }

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

function confirmDelete(reviewId) {
  console.log("ID do post a ser deletado:", reviewId);

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
        loadFeed();
      } else {
        const errorText = await res.text();
        Swal.fire("Erro", errorText || "Não foi possível excluir.", "error");
      }
    }
  });
}

async function toggleLike(reviewId) {
  const token = localStorage.getItem("michelinToken");

  await fetch(`${API_URL}/reviews/${reviewId}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  loadFeed();
}

function filterCategory(categoryName, clickedButton) {
  document.getElementById("searchInput").value = "";

  if (clickedButton) {
    const allButtons = document.querySelectorAll("#categoryFilters button");

    allButtons.forEach((btn) => {
      btn.classList.remove("btn-dark");
      btn.classList.add("btn-outline-dark");
    });

    clickedButton.classList.remove("btn-outline-dark");
    clickedButton.classList.add("btn-dark");
  }

  loadFeed(categoryName, "");
}

function searchRestaurant() {
  const searchName = document.getElementById("searchInput").value;

  const allButtons = document.querySelectorAll("#categoryFilters button");
  allButtons.forEach((btn) => {
    btn.classList.remove("btn-dark");
    btn.classList.add("btn-outline-dark");
  });
  allButtons[0].classList.remove("btn-outline-dark");
  allButtons[0].classList.add("btn-dark");

  loadFeed("", searchName);
}

async function viewUserProfile(userId, userName) {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  authSection.classList.add("d-none");
  feedSection.classList.add("d-none");
  profileSection.classList.remove("d-none");
  document.getElementById("profileTitle").innerText = `Perfil de ${userName}`;

  const response = await fetch(`${API_URL}/reviews/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();
  const profileData = await response.json();

  renderProfileData(profileData, loggedEmail);
}

async function loadProfile() {
  const token = localStorage.getItem("michelinToken");
  const loggedEmail = getLoggedEmail();

  document.getElementById("profileTitle").innerText = "Meu Perfil";

  const response = await fetch(`${API_URL}/reviews/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();
  const profileData = await response.json();

  renderProfileData(profileData, loggedEmail);
}

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
