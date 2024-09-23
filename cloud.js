// clouds.js
window.onload = function() {
    // Adicionar CSS para as nuvens
    const style = document.createElement('style');
    style.innerHTML = `
        .clouds-container {
            position: absolute;
            top: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            overflow: hidden;
            pointer-events: none; /* Para garantir que as nuvens não interfiram com interações do usuário */
        }

        .cloud {
            position: absolute;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50px;
            width: 200px;
            height: 60px;
            opacity: 0.8;
        }

        .cloud::before, .cloud::after {
            content: '';
            position: absolute;
            background: rgba(255, 255, 255, 0.8);
            width: 100px;
            height: 80px;
            border-radius: 50px;
        }

        .cloud::before {
            top: -40px;
            left: 10px;
        }

        .cloud::after {
            top: -20px;
            right: 10px;
        }

        @keyframes moveCloud {
            0% { transform: translateX(-200px); }
            100% { transform: translateX(120vw); }
        }

        .cloud-1 {
            top: 10%;
            left: -200px;
            animation: moveCloud 30s linear infinite;
        }

        .cloud-2 {
            top: 25%;
            left: -300px;
            animation: moveCloud 45s linear infinite;
        }

        .cloud-3 {
            top: 50%;
            left: -250px;
            animation: moveCloud 60s linear infinite;
        }

        .cloud-4 {
            top: 75%;
            left: -350px;
            animation: moveCloud 40s linear infinite;
        }
    `;
    document.head.appendChild(style);

    // Criar o container de nuvens
    const cloudsContainer = document.createElement('div');
    cloudsContainer.classList.add('clouds-container');
    document.body.appendChild(cloudsContainer);

    // Criar as nuvens
    const cloud1 = document.createElement('div');
    cloud1.classList.add('cloud', 'cloud-1');
    cloudsContainer.appendChild(cloud1);

    const cloud2 = document.createElement('div');
    cloud2.classList.add('cloud', 'cloud-2');
    cloudsContainer.appendChild(cloud2);

    const cloud3 = document.createElement('div');
    cloud3.classList.add('cloud', 'cloud-3');
    cloudsContainer.appendChild(cloud3);

    const cloud4 = document.createElement('div');
    cloud4.classList.add('cloud', 'cloud-4');
    cloudsContainer.appendChild(cloud4);
};
