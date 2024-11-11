// uvManipulation.js

export function scaleUVs(model, scaleU, scaleV) {
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

export function modifyUVs(model, offsetU, offsetV) {
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

export function updateUVs(model, originalUVs, offsetX, offsetY, scale, invertV = true) {
    model.traverse((child) => {
        if (child.isMesh) {
            const uvAttribute = child.geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
                const originalU = originalUVs[i * 2];
                const originalV = originalUVs[i * 2 + 1];
                let u = originalU * scale + offsetX;
                let v = originalV * scale + offsetY;
                if (invertV) {
                    v = 1 - v;
                }
                uvAttribute.array[i * 2] = u;
                uvAttribute.array[i * 2 + 1] = v;
            }
            uvAttribute.needsUpdate = true;
        }
    });
}

export function drawUVMap(model, ctx, uvWidth, uvHeight, texture) {
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
