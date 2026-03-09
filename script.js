const API_URL = "http://localhost:8080";

// Elementos
const authSection = document.getElementById("authSection");
const feedSection = document.getElementById("feedSection");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

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
}

function checkAuth() {
  if (localStorage.getItem("michelinToken")) showFeed();
}

function showFeed() {
  authSection.classList.add("d-none");
  feedSection.classList.remove("d-none");
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

async function loadFeed() {
  const token = localStorage.getItem("michelinToken");

  const response = await fetch(`${API_URL}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403) return logout();

  const reviews = await response.json();
  const feedContainer = document.getElementById("feedContainer");
  feedContainer.innerHTML = ""; // Limpa antes de carregar

  reviews.forEach((review) => {
    // Converte o número 4 em "⭐⭐⭐⭐", por exemplo.
    const starsHtml = "⭐".repeat(review.rating);

    // Puxa a foto lá da pasta 'uploads' do seu Java
    const imageUrl = `${API_URL}/uploads/${review.imagePath}`;

    feedContainer.innerHTML += `
            <div class="col-md-6">
                <div class="review-card position-relative">
                    <span class="category-badge">${review.category}</span>
                    <img src="${imageUrl}" class="review-img" alt="Foto do prato">
                    <div class="p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="fw-bold mb-0">${review.restaurantName}</h5>
                            <span class="stars">${starsHtml}</span>
                        </div>
                        <p class="text-muted small mb-2">"${review.comment}"</p>
                        <hr class="my-2">
                        <p class="author-text mb-0">Postado por <strong>${review.user.name}</strong></p>
                    </div>
                </div>
            </div>
        `;
  });
}

checkAuth();
