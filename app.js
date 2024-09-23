let model, texture, normalMap, textureLoaded = false;
let uvOffsetU = -0.004, uvOffsetV = 0.0;
let updatedUVs = null;

const dropzone = document.getElementById('dropzone');
const coffeeBagCheckbox = document.getElementById('coffeeBag');
const flowpackCheckbox = document.getElementById('flowpack');
const vacuumCoffeeCheckbox = document.getElementById('vacuumCoffee');
const viewer = document.getElementById('viewer');
const renderBtn = document.getElementById('renderBtn');
const loadingPlaceholder = document.getElementById('loadingPlaceholder');

const openUVEditorBtn = document.getElementById('openUVEditorBtn');
const uvEditorContainer = document.getElementById('uvEditorContainer');
const closeUVEditorBtn = document.getElementById('closeUVEditorBtn');
const resetUVBtn = document.getElementById('resetUVBtn');
const overlay = document.getElementById('overlay');

const uvCanvas = document.getElementById('uvCanvas');
const ctx = uvCanvas.getContext('2d');
let uvWidth = 500;
let uvHeight = 500;

uvCanvas.width = uvWidth;
uvCanvas.height = uvHeight;

const normalMapPaths = {
    coffeeBag: 'https://andregazineu.github.io/madreculo/MetalGoldPaint002_NRM_2K_METALNESS.png',
    flowpack: 'https://andregazineu.github.io/madreculo/MetalGoldPaint002_NRM_2K_METALNESS.png',
    vacuumCoffee: 'https://andregazineu.github.io/madreculo/Material_normal.png'
};

let originalUVs = [];
let isDragging = false;
let lastMouseX, lastMouseY;
let offsetX = 0, offsetY = 0;
let scale = 1;

// Função para escalar as UVs do modelo
function scaleUVs(model, scaleU, scaleV) {
    model.traverse((child) => {
        if (child.isMesh) {
            const uvAttribute = child.geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
                const u = uvAttribute.getX(i);
                const v = uvAttribute.getY(i);
                uvAttribute.setXY(i, u * scaleU, v * scaleV);
            }
            uvAttribute.needsUpdate = true;
        }
    });
}

// Função para modificar/deslocar as UVs
function modifyUVs(model, offsetU, offsetV) {
    model.traverse((child) => {
        if (child.isMesh) {
            const uvAttribute = child.geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
                const u = uvAttribute.getX(i);
                const v = uvAttribute.getY(i);
                uvAttribute.setXY(i, u + offsetU, v + offsetV);
            }
            uvAttribute.needsUpdate = true;
        }
    });
}

// Função para aplicar o normal map
function applyNormalMap(normalMapPath, model) {
    const loader = new THREE.TextureLoader();
    loader.load(normalMapPath, (loadedNormalMap) => {
        normalMap = loadedNormalMap;
        normalMap.flipY = false;

        model.traverse((child) => {
            if (child.isMesh) {
                child.material.normalMap = normalMap;
				child.material.normalScale = new THREE.Vector2(2, 2);
                child.material.needsUpdate = true;
            }
        });
    });
}

// Função para atualizar o modelo baseado na seleção
function updateModel() {
    let normalMapPath;
    if (coffeeBagCheckbox.checked) {
        viewer.src = coffeeBagCheckbox.value;
        normalMapPath = normalMapPaths.coffeeBag;
    } else if (flowpackCheckbox.checked) {
        viewer.src = flowpackCheckbox.value;
        normalMapPath = normalMapPaths.flowpack;
    } else if (vacuumCoffeeCheckbox.checked) {
        viewer.src = vacuumCoffeeCheckbox.value;
        normalMapPath = normalMapPaths.vacuumCoffee;
    }

    return normalMapPath;
}

// Eventos de checkbox
coffeeBagCheckbox.addEventListener('change', () => {
    if (coffeeBagCheckbox.checked) {
        flowpackCheckbox.checked = false;
        vacuumCoffeeCheckbox.checked = false;
        updateModel();
    }
});

flowpackCheckbox.addEventListener('change', () => {
    if (flowpackCheckbox.checked) {
        coffeeBagCheckbox.checked = false;
        vacuumCoffeeCheckbox.checked = false;
        updateModel();
    }
});

vacuumCoffeeCheckbox.addEventListener('change', () => {
    if (vacuumCoffeeCheckbox.checked) {
        coffeeBagCheckbox.checked = false;
        flowpackCheckbox.checked = false;
        updateModel();
    }
});

// Eventos de drag and drop para texturas
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#3897f0';
});

dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#dbdbdb';
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#dbdbdb';
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        texture = new THREE.TextureLoader().load(event.target.result);
        texture.flipY = false;
        textureLoaded = true;
        alert("Textura carregada com sucesso!");
        renderBtn.disabled = false;
    };

    reader.readAsDataURL(file);
});

// Evento de clique no botão de renderizar
renderBtn.addEventListener('click', function() {
    if (!textureLoaded) return;

    loadingPlaceholder.style.display = "flex";
    viewer.style.display = "none";

    const loader = new THREE.GLTFLoader();
    const normalMapPath = updateModel();

    loader.load(viewer.src, function(gltf) {
        model = gltf.scene;

        // Escalar UVs e aplicar normal map
        scaleUVs(model, 1.00, 1.00);
        modifyUVs(model, uvOffsetU, uvOffsetV);
        applyNormalMap(normalMapPath, model);

        if (texture) {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
            });
        }

        // Salvar UVs originais
        model.traverse((child) => {
            if (child.isMesh) {
                const uvAttribute = child.geometry.attributes.uv;
                originalUVs = uvAttribute.array.slice();
                updatedUVs = uvAttribute.array.slice(); 
            }
        });

        const exporter = new THREE.GLTFExporter();
        exporter.parse(model, function(result) {
            const blob = new Blob([result], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            viewer.src = url;
            loadingPlaceholder.style.display = "none";
            viewer.style.display = "block";
        }, { binary: true });
    });
});

// Eventos para abrir e fechar o UV Editor
openUVEditorBtn.addEventListener('click', () => {
    uvEditorContainer.classList.add('active');
    overlay.classList.add('active');
    initUVEditor();
});

closeUVEditorBtn.addEventListener('click', () => {
    uvEditorContainer.classList.remove('active');
    overlay.classList.remove('active');
});

// Evento para redefinir UVs e salvar as novas UVs
resetUVBtn.addEventListener('click', () => {
    if (model) {
        model.traverse((child) => {
            if (child.isMesh) {
                const uvAttribute = child.geometry.attributes.uv;
                updatedUVs = uvAttribute.array.slice(); // Salva a nova UV atualizada
                alert("Nova UV salva com sucesso.");
            }
        });
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        drawUVMap();
        updateModelViewer(); 
    }
});

// Funções do UV Editor
function initUVEditor() {
    if (!model) {
        alert("Carregue e visualize um modelo primeiro.");
        uvEditorContainer.classList.remove('active');
        overlay.classList.remove('active');
        return;
    }

    drawUVMap();

    // Eventos de mouse para interatividade
    uvCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        uvCanvas.style.cursor = 'grabbing';
    });

    uvCanvas.addEventListener('mouseup', () => {
        isDragging = false;
        uvCanvas.style.cursor = 'grab';
    });

    uvCanvas.addEventListener('mouseleave', () => {
        isDragging = false;
        uvCanvas.style.cursor = 'grab';
    });

    uvCanvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            offsetX += deltaX;
            offsetY -= deltaY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            updateUVs(false); // Não inverte as UVs ao editar
            drawUVMap();
        }
    });

    uvCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.0003;
        scale += e.deltaY * -zoomIntensity;
        scale = Math.min(Math.max(0.1, scale), 10);
        updateUVs(false); // Não inverte as UVs ao editar
        drawUVMap();
    });
}

// Atualiza as UVs do modelo com base nas manipulações
function updateUVs(invertV = true) {
    if (!model) return;
    model.traverse((child) => {
        if (child.isMesh) {
            const uvAttribute = child.geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
                const originalU = originalUVs[i * 2];
                const originalV = originalUVs[i * 2 + 1];

                let u = originalU * scale + offsetX / uvWidth;
                let v = originalV * scale + offsetY / uvHeight;

                if (invertV) {
                    v = 1 - v; // Inverte o eixo V apenas ao salvar
                }

                uvAttribute.array[i * 2] = u;
                uvAttribute.array[i * 2 + 1] = v;
            }
            uvAttribute.needsUpdate = true;
        }
    });
}

// Desenha o mapa UV no canvas
function drawUVMap() {
    if (!model) return;
    ctx.clearRect(0, 0, uvWidth, uvHeight);

    if (texture) {
        ctx.drawImage(texture.image, 0, 0, uvWidth, uvHeight);
    } else {
        ctx.fillStyle = '#3c3f41';
        ctx.fillRect(0, 0, uvWidth, uvHeight);
    }

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;

    model.traverse((child) => {
        if (child.isMesh) {
            const indexArray = child.geometry.index.array;
            const uvArray = child.geometry.attributes.uv.array;

            for (let i = 0; i < indexArray.length; i += 3) {
                const idx0 = indexArray[i];
                const idx1 = indexArray[i + 1];
                const idx2 = indexArray[i + 2];

                const u0 = uvArray[idx0 * 2] * uvWidth;
                const v0 = uvArray[idx0 * 2 + 1] * uvHeight;

                const u1 = uvArray[idx1 * 2] * uvWidth;
                const v1 = uvArray[idx1 * 2 + 1] * uvHeight;

                const u2 = uvArray[idx2 * 2] * uvWidth;
                const v2 = uvArray[idx2 * 2 + 1] * uvHeight;

                ctx.beginPath();
                ctx.moveTo(u0, v0);
                ctx.lineTo(u1, v1);
                ctx.lineTo(u2, v2);
                ctx.closePath();
                ctx.stroke();
            }
        }
    });
}

// Função para ajustar o tamanho do UV Editor ao redimensionar a janela
window.addEventListener('resize', () => {
    // Opcional: Ajustar o tamanho do UV Editor se necessário
});

// Fechar o UV Editor ao clicar no overlay
overlay.addEventListener('click', () => {
    uvEditorContainer.classList.remove('active');
    overlay.classList.remove('active');
});

// Função para atualizar o model-viewer após salvar UV
function updateModelViewer() {
    const exporter = new THREE.GLTFExporter();
    exporter.parse(model, function(result) {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        viewer.src = url;
        loadingPlaceholder.style.display = "none";
        viewer.style.display = "block";
    }, { binary: true });
}

// Carregar o modelo inicial
const loader = new THREE.GLTFLoader();
loader.load('https://andregazineu.github.io/madreculo/Coffee_with_texture.glb', function(gltf) {
    model = gltf.scene;

    // Escalar UVs e salvar UVs originais
    scaleUVs(model, 1.00, 1.00);
    modifyUVs(model, uvOffsetU, uvOffsetV);

    // Salvar UVs originais
    model.traverse((child) => {
        if (child.isMesh) {
            const uvAttribute = child.geometry.attributes.uv;
            originalUVs = uvAttribute.array.slice();
            updatedUVs = uvAttribute.array.slice();
        }
    });

    const normalMapPath = normalMapPaths.vacuumCoffee;
    applyNormalMap(normalMapPath, model);

    if (texture) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.map = texture;
                child.material.needsUpdate = true;
            }
        });
    }

    updateModelViewer();
});
