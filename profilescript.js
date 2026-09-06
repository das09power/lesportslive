// AUTH GUARD - Redirect to login if not logged in
if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
}

let cropperInstance = null;
let currentCropType = ""; // 'admin' or 'org'

let base64AdminDp = "";
let base64OrgLogo = "";

document.addEventListener("DOMContentLoaded", () => {
    loadProfileAndLoginDefaults();

    // Event Listeners for File Inputs
    const adminInput = document.getElementById("adminFileInput");
    if (adminInput) {
        adminInput.addEventListener("change", (e) => openCropperModal(e, 'admin'));
    }

    const orgInput = document.getElementById("orgFileInput");
    if (orgInput) {
        orgInput.addEventListener("change", (e) => openCropperModal(e, 'org'));
    }

    // Form Submit
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", saveProfileData);
    }

    // Log Out Event Listener with Proper Storage Clearing
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const confirmLogout = confirm("Kya aap sach me Log Out karna chahte hain?");
            if (confirmLogout) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                localStorage.setItem('isLoggedIn', 'false');
                window.location.href = "login.html";
            }
        });
    }
});

function loadProfileAndLoginDefaults() {
    let profileData = {};
    let loginData = {};

    if (localStorage.getItem('user_profile')) {
        try { profileData = JSON.parse(localStorage.getItem('user_profile')); } catch (e) {}
    }
    if (localStorage.getItem('currentUser')) {
        try { loginData = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
    }

    const userName = profileData.name || loginData.name || loginData.username || localStorage.getItem('userName') || "Lovers Admin";
    const userEmail = profileData.email || loginData.email || localStorage.getItem('userEmail') || "admin@loversesports.com";
    const orgName = profileData.orgName || profileData.organization || localStorage.getItem('orgName') || "LOVERS ESPORTS";

    base64AdminDp = profileData.adminDp || localStorage.getItem('adminDp') || "";
    base64OrgLogo = profileData.orgLogo || profileData.logo || localStorage.getItem('orgLogo') || "";

    const nameInput = document.getElementById("userNameInput");
    const emailInput = document.getElementById("userEmailInput");
    const orgInput = document.getElementById("orgNameInput");

    if (nameInput) nameInput.value = userName;
    if (emailInput) emailInput.value = userEmail;
    if (orgInput) orgInput.value = orgName;

    renderAdminDpPreview(base64AdminDp, userName);
    renderOrgLogoPreview(base64OrgLogo, orgName);
}

function openCropperModal(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB!");
        return;
    }

    currentCropType = type;
    const reader = new FileReader();

    reader.onload = function (e) {
        const imageElement = document.getElementById("cropperImageSrc");
        if (!imageElement) return;
        imageElement.src = e.target.result;

        const modal = document.getElementById("cropModal");
        if (modal) modal.style.display = "flex";

        if (cropperInstance) {
            cropperInstance.destroy();
        }

        cropperInstance = new Cropper(imageElement, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 0.9,
            responsive: true,
            background: false
        });
    };

    reader.readAsDataURL(file);
    event.target.value = "";
}

function applyCroppedImage() {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
        width: 300,
        height: 300
    });

    const croppedBase64 = canvas.toDataURL("image/png");

    if (currentCropType === 'admin') {
        base64AdminDp = croppedBase64;
        const nameInput = document.getElementById("userNameInput");
        const name = nameInput ? nameInput.value : "";
        renderAdminDpPreview(base64AdminDp, name);
    } else if (currentCropType === 'org') {
        base64OrgLogo = croppedBase64;
        const orgInput = document.getElementById("orgNameInput");
        const orgName = orgInput ? orgInput.value : "";
        renderOrgLogoPreview(base64OrgLogo, orgName);
    }

    closeCropperModal();
}

function closeCropperModal() {
    const modal = document.getElementById("cropModal");
    if (modal) modal.style.display = "none";

    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

function renderAdminDpPreview(src, name) {
    const container = document.getElementById("adminDpPreview");
    if (!container) return;
    if (src && src.trim() !== "") {
        container.innerHTML = `<img src="${src}" alt="Admin DP">`;
    } else {
        const char = (name && name.trim() !== "") ? name.charAt(0).toUpperCase() : "A";
        container.innerHTML = `<span id="adminAvatarText">${char}</span>`;
    }
}

function renderOrgLogoPreview(src, orgName) {
    const container = document.getElementById("orgLogoPreview");
    const sidebarLogo = document.getElementById("sidebarBrandLogo");
    const sidebarOrgText = document.getElementById("sidebarOrgName");

    if (sidebarOrgText) sidebarOrgText.innerText = orgName || "LOVERS ESPORTS";

    if (src && src.trim() !== "") {
        if (container) container.innerHTML = `<img src="${src}" alt="Org Logo">`;
        if (sidebarLogo) sidebarLogo.innerHTML = `<img src="${src}" alt="Org Logo">`;
    } else {
        const char = (orgName && orgName.trim() !== "") ? orgName.charAt(0).toUpperCase() : "L";
        if (container) container.innerHTML = `<span id="orgAvatarText">${char}</span>`;
        if (sidebarLogo) sidebarLogo.innerHTML = char;
    }
}

function saveProfileData(e) {
    e.preventDefault();

    const name = document.getElementById("userNameInput").value.trim();
    const email = document.getElementById("userEmailInput").value.trim();
    const orgName = document.getElementById("orgNameInput").value.trim();

    const profileData = {
        name: name,
        email: email,
        orgName: orgName,
        adminDp: base64AdminDp,
        orgLogo: base64OrgLogo
    };

    localStorage.setItem('user_profile', JSON.stringify(profileData));
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('orgName', orgName);
    localStorage.setItem('adminDp', base64AdminDp);
    localStorage.setItem('orgLogo', base64OrgLogo);

    renderOrgLogoPreview(base64OrgLogo, orgName);

    const toast = document.getElementById("alertToast");
    if (toast) {
        toast.style.display = "flex";
        setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    }
}