// uvFunctions.js

export class UVEditor {
    constructor(model, uvCanvas, options = {}) {
        this.model = model;
        this.uvCanvas = uvCanvas;
        this.ctx = uvCanvas.getContext('2d');
        this.uvWidth = options.uvWidth || 500;
        this.uvHeight = options.uvHeight || 500;
        this.uvCanvas.width = this.uvWidth;
        this.uvCanvas.height = this.uvHeight;

        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.selectedIsland = null;
        this.islandOffsets = new Map();
        this.isIslandMovementEnabled = false;

        // Inicializa as ilhas UV
        this.initUVIslands();

        // Bind dos event handlers
        this.initEventHandlers();
    }

    initializeIslandOffsets(islandKey) {
        if (!this.islandOffsets.has(islandKey)) {
            this.islandOffsets.set(islandKey, { offsetX: 0, offsetY: 0, scale: 1 });
        }
        return this.islandOffsets.get(islandKey);
    }

    buildUVIslands(mesh) {
        const geometry = mesh.geometry;
        const uvAttribute = geometry.attributes.uv;
        const index = geometry.index;
        if (!uvAttribute || !index) return { islands: [] };

        const faceCount = index.count / 3;
        const parent = new Array(faceCount).fill(0).map((_, i) => i);

        const find = (i) => {
            if (parent[i] !== i) {
                parent[i] = find(parent[i]);
            }
            return parent[i];
        };

        const union = (i, j) => {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                parent[rootI] = rootJ;
            }
        };

        const edgeMap = new Map();

        for (let i = 0; i < faceCount; i++) {
            const idx0 = index.array[i * 3];
            const idx1 = index.array[i * 3 + 1];
            const idx2 = index.array[i * 3 + 2];

            const uv0 = [uvAttribute.getX(idx0), uvAttribute.getY(idx0)];
            const uv1 = [uvAttribute.getX(idx1), uvAttribute.getY(idx1)];
            const uv2 = [uvAttribute.getX(idx2), uvAttribute.getY(idx2)];

            const edges = [
                { a: idx0, b: idx1, uvA: uv0, uvB: uv1 },
                { a: idx1, b: idx2, uvA: uv1, uvB: uv2 },
                { a: idx2, b: idx0, uvA: uv2, uvB: uv0 },
            ];

            edges.forEach(edge => {
                const key = edge.a < edge.b ? `${edge.a}_${edge.b}` : `${edge.b}_${edge.a}`;
                if (!edgeMap.has(key)) {
                    edgeMap.set(key, []);
                }
                edgeMap.get(key).push({ faceIndex: i, uvA: edge.uvA, uvB: edge.uvB });
            });
        }

        for (const faces of edgeMap.values()) {
            if (faces.length < 2) continue;
            const baseFace = faces[0];
            for (let i = 1; i < faces.length; i++) {
                const compareFace = faces[i];

                const sameUVs =
                    baseFace.uvA[0] === compareFace.uvB[0] &&
                    baseFace.uvA[1] === compareFace.uvB[1] &&
                    baseFace.uvB[0] === compareFace.uvA[0] &&
                    baseFace.uvB[1] === compareFace.uvA[1];

                if (sameUVs) {
                    union(baseFace.faceIndex, compareFace.faceIndex);
                }
            }
        }

        const islandsMap = new Map();

        for (let i = 0; i < faceCount; i++) {
            const root = find(i);
            if (!islandsMap.has(root)) {
                islandsMap.set(root, []);
            }
            islandsMap.get(root).push(i);
        }

        const islands = [];

        islandsMap.forEach(faceIndices => {
            const island = { triangles: [] };
            faceIndices.forEach(faceIndex => {
                const idx0 = index.array[faceIndex * 3];
                const idx1 = index.array[faceIndex * 3 + 1];
                const idx2 = index.array[faceIndex * 3 + 2];
                island.triangles.push({ indices: [idx0, idx1, idx2] });
            });
            islands.push(island);
        });

        return { islands };
    }

    modifyUVs(selectedIsland) {
        if (!selectedIsland || !selectedIsland.mesh) return;
        const mesh = selectedIsland.mesh;
        const islandIndex = selectedIsland.islandIndex;
        const islandKey = `${mesh.uuid}_${islandIndex}`;
        const uvIslandsData = mesh.userData.uvIslands;
        const islandTriangles = uvIslandsData.islands[islandIndex].triangles;
        const uvAttribute = mesh.geometry.attributes.uv;
        const originalUVs = mesh.userData.originalUVs;
        const islandData = this.initializeIslandOffsets(islandKey);

        let sumU = 0, sumV = 0, count = 0;
        const vertexIndicesSet = new Set();
        islandTriangles.forEach(triangle => {
            triangle.indices.forEach(vertexIndex => {
                if (!vertexIndicesSet.has(vertexIndex)) {
                    vertexIndicesSet.add(vertexIndex);
                    sumU += originalUVs[vertexIndex * 2];
                    sumV += originalUVs[vertexIndex * 2 + 1];
                    count++;
                }
            });
        });
        const centerU = sumU / count;
        const centerV = sumV / count;

        islandTriangles.forEach(triangle => {
            triangle.indices.forEach(vertexIndex => {
                const origU = originalUVs[vertexIndex * 2];
                const origV = originalUVs[vertexIndex * 2 + 1];
                uvAttribute.array[vertexIndex * 2] = ((origU - centerU) * islandData.scale) + centerU + islandData.offsetX;
                uvAttribute.array[vertexIndex * 2 + 1] = ((origV - centerV) * islandData.scale) + centerV + islandData.offsetY;
            });
        });
        uvAttribute.needsUpdate = true;
    }

    drawUVMap() {
        if (!this.model) return;
        this.ctx.clearRect(0, 0, this.uvWidth, this.uvHeight);

        this.model.traverse((mesh) => {
            if (mesh.isMesh) {
                const uvIslandsData = mesh.userData.uvIslands;
                const uvArray = mesh.geometry.attributes.uv.array;

                uvIslandsData.islands.forEach((island, index) => {
                    const isSelected = this.selectedIsland && this.selectedIsland.mesh === mesh && this.selectedIsland.islandIndex === index;
                    this.ctx.strokeStyle = isSelected ? '#ff0000' : '#00ffff';
                    this.ctx.lineWidth = isSelected ? 2 : 1;

                    island.triangles.forEach(triangle => {
                        const [idx0, idx1, idx2] = triangle.indices;
                        this.ctx.beginPath();
                        this.ctx.moveTo(uvArray[idx0 * 2] * this.uvWidth, uvArray[idx0 * 2 + 1] * this.uvHeight);
                        this.ctx.lineTo(uvArray[idx1 * 2] * this.uvWidth, uvArray[idx1 * 2 + 1] * this.uvHeight);
                        this.ctx.lineTo(uvArray[idx2 * 2] * this.uvWidth, uvArray[idx2 * 2 + 1] * this.uvHeight);
                        this.ctx.closePath();
                        this.ctx.stroke();
                    });
                });
            }
        });
    }

    findIslandUnderMouse(x, y) {
        if (!this.model) return null;
        let foundIsland = null;

        this.model.traverse((mesh) => {
            if (mesh.isMesh && !foundIsland) {
                const uvIslandsData = mesh.userData.uvIslands;
                const uvArray = mesh.geometry.attributes.uv.array;

                uvIslandsData.islands.some((island, index) => {
                    const path = new Path2D();
                    island.triangles.forEach(triangle => {
                        const [idx0, idx1, idx2] = triangle.indices;
                        path.moveTo(uvArray[idx0 * 2] * this.uvWidth, uvArray[idx0 * 2 + 1] * this.uvHeight);
                        path.lineTo(uvArray[idx1 * 2] * this.uvWidth, uvArray[idx1 * 2 + 1] * this.uvHeight);
                        path.lineTo(uvArray[idx2 * 2] * this.uvWidth, uvArray[idx2 * 2 + 1] * this.uvHeight);
                        path.closePath();
                    });
                    if (this.ctx.isPointInPath(path, x, y)) {
                        foundIsland = { mesh, islandIndex: index };
                        return true;
                    }
                });
            }
        });
        return foundIsland;
    }

    updateUVs(invertV = false) {
        if (!this.model) return;
        this.model.traverse((child) => {
            if (child.isMesh) {
                const uvAttribute = child.geometry.attributes.uv;
                for (let i = 0; i < uvAttribute.count; i++) {
                    const originalU = child.userData.originalUVs[i * 2];
                    const originalV = child.userData.originalUVs[i * 2 + 1];
                    let u = originalU * this.scale + this.offsetX / this.uvWidth;
                    let v = originalV * this.scale + this.offsetY / this.uvHeight;
                    uvAttribute.array[i * 2] = u;
                    uvAttribute.array[i * 2 + 1] = v;
                }
                uvAttribute.needsUpdate = true;
            }
        });
    }

    initUVIslands() {
        if (!this.model) {
            alert("Carregue e visualize um modelo primeiro.");
            return;
        }

        this.model.traverse((mesh) => {
            if (mesh.isMesh) {
                const uvAttribute = mesh.geometry.attributes.uv;
                if (uvAttribute) {
                    mesh.userData.originalUVs = uvAttribute.array.slice();
                    mesh.userData.uvIslands = this.buildUVIslands(mesh);
                }
            }
        });

        this.drawUVMap();
    }

    updateModelViewer() {
        const exporter = new THREE.GLTFExporter();
        exporter.parse(this.model, (result) => {
            const blob = new Blob([result], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const viewer = document.getElementById('viewer');
            viewer.src = url;
            const loadingPlaceholder = document.getElementById('loadingPlaceholder');
            loadingPlaceholder.style.display = "none";
            viewer.style.display = "block";
        }, { binary: true });
    }

    initEventHandlers() {
        this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
        this.onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
        this.onCanvasMouseUp = this.onCanvasMouseUp.bind(this);
        this.onCanvasWheel = this.onCanvasWheel.bind(this);

        this.uvCanvas.addEventListener('mousedown', this.onCanvasMouseDown);
        this.uvCanvas.addEventListener('mousemove', this.onCanvasMouseMove);
        this.uvCanvas.addEventListener('mouseup', this.onCanvasMouseUp);
        this.uvCanvas.addEventListener('wheel', this.onCanvasWheel);
    }

    onCanvasMouseDown(e) {
        const rect = this.uvCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isIslandMovementEnabled) {
            this.selectedIsland = this.findIslandUnderMouse(x, y);

            if (this.selectedIsland) {
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.uvCanvas.style.cursor = 'grabbing';
            }
            this.drawUVMap();
        } else {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.uvCanvas.style.cursor = 'grabbing';
        }
    }

    onCanvasMouseMove(e) {
        if (this.isDragging) {
            if (this.isIslandMovementEnabled && this.selectedIsland) {
                const islandKey = `${this.selectedIsland.mesh.uuid}_${this.selectedIsland.islandIndex}`;
                const islandData = this.initializeIslandOffsets(islandKey);

                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                islandData.offsetX += deltaX / this.uvWidth;
                islandData.offsetY += deltaY / this.uvHeight;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                this.modifyUVs(this.selectedIsland);
                this.drawUVMap();
            } else if (!this.isIslandMovementEnabled) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                this.offsetX += deltaX;
                this.offsetY += deltaY;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.updateUVs(false);
                this.drawUVMap();
            }
        }
    }

    onCanvasMouseUp() {
        this.isDragging = false;
        this.uvCanvas.style.cursor = 'default';
    }

    onCanvasWheel(e) {
        if (this.isIslandMovementEnabled && this.selectedIsland) {
            e.preventDefault();
            const islandKey = `${this.selectedIsland.mesh.uuid}_${this.selectedIsland.islandIndex}`;
            const islandData = this.initializeIslandOffsets(islandKey);

            const zoomIntensity = 0.001;
            islandData.scale = Math.max(0.1, Math.min(10, islandData.scale + e.deltaY * -zoomIntensity));

            this.modifyUVs(this.selectedIsland);
            this.drawUVMap();
        } else if (!this.isIslandMovementEnabled) {
            e.preventDefault();
            const zoomIntensity = 0.0002;
            this.scale += e.deltaY * -zoomIntensity;
            this.scale = Math.min(Math.max(0.1, this.scale), 10);
            this.updateUVs(false);
            this.drawUVMap();
        }
    }

    toggleIslandMovement() {
        this.isIslandMovementEnabled = !this.isIslandMovementEnabled;
        const toggleIslandMovementBtn = document.getElementById('toggleIslandMovementBtn');
        toggleIslandMovementBtn.textContent = this.isIslandMovementEnabled ? 'Desabilitar Movimentação Individual de Ilhas UV' : 'Habilitar Movimentação Individual de Ilhas UV';
        this.selectedIsland = null;
        this.drawUVMap();
    }

    resetUVs() {
        if (this.model) {
            this.model.traverse((mesh) => {
                if (mesh.isMesh) {
                    const uvAttribute = mesh.geometry.attributes.uv;
                    mesh.userData.originalUVs = uvAttribute.array.slice();
                    alert("Nova UV salva com sucesso.");
                }
            });
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.islandOffsets.clear();
            this.drawUVMap();
            this.updateModelViewer();
        }
    }
}
