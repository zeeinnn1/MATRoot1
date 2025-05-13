document.addEventListener('DOMContentLoaded', function() {
    // Configuración inicial
    const systemSizeSelect = document.getElementById('system-size');
    const methodSelect = document.getElementById('method-select');
    const generateBtn = document.getElementById('generate-btn');
    const solveBtn = document.getElementById('solve-btn');
    const matrixContainer = document.getElementById('matrix-container');
    const resultsContainer = document.getElementById('results-container');
    const stepsContainer = document.getElementById('steps-container');
    
    let matrix = [];
    let size = 3;
    
    // Generar matriz de entrada
    generateBtn.addEventListener('click', generateMatrix);
    systemSizeSelect.addEventListener('change', function() {
        size = parseInt(this.value);
    });
    
    solveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        solveSystem();
    });
    
    function generateMatrix() {
        matrixContainer.innerHTML = '';
        matrix = [];
        
        // Crear tabla para la matriz aumentada
        const table = document.createElement('table');
        table.className = 'table table-bordered';
        
        // Generar filas y columnas
        for (let i = 0; i < size; i++) {
            const row = document.createElement('tr');
            const equation = [];
            
            for (let j = 0; j <= size; j++) {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                
                input.type = 'number';
                input.className = 'form-control matrix-input';
                input.step = 'any';
                input.placeholder = j < size ? `x${j+1}` : 'b';
                
                // Valores por defecto para ejemplo
                if (size === 3) {
                    if (i === 0) input.value = j === 0 ? '2' : j === 1 ? '1' : j === 2 ? '-1' : '8';
                    if (i === 1) input.value = j === 0 ? '-3' : j === 1 ? '-1' : j === 2 ? '2' : '-11';
                    if (i === 2) input.value = j === 0 ? '-2' : j === 1 ? '1' : j === 2 ? '2' : '-3';
                }
                
                cell.appendChild(input);
                row.appendChild(cell);
                equation.push(input);
            }
            
            table.appendChild(row);
            matrix.push(equation);
        }
        
        matrixContainer.appendChild(table);
        solveBtn.disabled = false;
    }
    
    function solveSystem() {
        const method = methodSelect.value;
        const n = size;
        
        // Obtener valores de la matriz
        const A = [];
        const b = [];
        
        for (let i = 0; i < n; i++) {
            A[i] = [];
            for (let j = 0; j < n; j++) {
                A[i][j] = parseFloat(matrix[i][j].value) || 0;
            }
            b[i] = parseFloat(matrix[i][n].value) || 0;
        }
        
        let solution, steps;
        
        try {
            switch (method) {
                case 'gauss':
                    [solution, steps] = gaussianElimination(A, b, n);
                    break;
                case 'gauss-jordan':
                    [solution, steps] = gaussJordan(A, b, n);
                    break;
                case 'lu':
                    [solution, steps] = luDecomposition(A, b, n);
                    break;
                case 'cramer':
                    if (n > 3) throw new Error("La regla de Cramer solo funciona para sistemas de hasta 3x3");
                    [solution, steps] = cramerRule(A, b, n);
                    break;
                default:
                    throw new Error("Método no implementado");
            }
            
            displayResults(solution, steps);
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
            stepsContainer.innerHTML = '<p class="text-danger">No se pudieron generar los pasos debido al error</p>';
        }
    }
    
    // Método de Eliminación Gaussiana
    function gaussianElimination(A, b, n) {
        const steps = [];
        const Ab = augmentedMatrix(A, b);
        
        steps.push({
            action: 'Matriz aumentada inicial',
            matrix: cloneMatrix(Ab),
            explanation: 'Comenzamos con la matriz aumentada del sistema.'
        });
        
        // Eliminación hacia adelante
        for (let i = 0; i < n; i++) {
            // Pivoteo parcial
            let maxRow = i;
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(Ab[j][i]) > Math.abs(Ab[maxRow][i])) {
                    maxRow = j;
                }
            }
            
            if (maxRow !== i) {
                [Ab[i], Ab[maxRow]] = [Ab[maxRow], Ab[i]];
                steps.push({
                    action: `Pivoteo parcial`,
                    matrix: cloneMatrix(Ab),
                    explanation: `Intercambiamos fila ${i+1} con fila ${maxRow+1} para tener el mayor pivote.`
                });
            }
            
            // Eliminación
            for (let j = i + 1; j < n; j++) {
                const factor = Ab[j][i] / Ab[i][i];
                
                steps.push({
                    action: `Eliminación en fila ${j+1}`,
                    matrix: cloneMatrix(Ab),
                    explanation: `F${j+1} ← F${j+1} - (${factor.toFixed(2)}) × F${i+1}`
                });
                
                for (let k = i; k <= n; k++) {
                    Ab[j][k] -= factor * Ab[i][k];
                }
            }
        }
        
        // Sustitución hacia atrás
        const x = new Array(n);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += Ab[i][j] * x[j];
            }
            x[i] = (Ab[i][n] - sum) / Ab[i][i];
        }
        
        steps.push({
            action: 'Sustitución hacia atrás',
            matrix: null,
            explanation: `Obtenemos la solución: ${x.map((val, idx) => `x<sub>${idx+1}</sub> = ${val.toFixed(6)}`).join(', ')}`
        });
        
        return [x, steps];
    }
    
    // Método de Gauss-Jordan
    function gaussJordan(A, b, n) {
        const steps = [];
        const Ab = augmentedMatrix(A, b);
        
        steps.push({
            action: 'Matriz aumentada inicial',
            matrix: cloneMatrix(Ab),
            explanation: 'Comenzamos con la matriz aumentada del sistema.'
        });
        
        for (let i = 0; i < n; i++) {
            // Pivoteo parcial
            let maxRow = i;
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(Ab[j][i]) > Math.abs(Ab[maxRow][i])) {
                    maxRow = j;
                }
            }
            
            if (maxRow !== i) {
                [Ab[i], Ab[maxRow]] = [Ab[maxRow], Ab[i]];
                steps.push({
                    action: `Pivoteo parcial`,
                    matrix: cloneMatrix(Ab),
                    explanation: `Intercambiamos fila ${i+1} con fila ${maxRow+1} para tener el mayor pivote.`
                });
            }
            
            // Hacer el pivote 1
            const pivot = Ab[i][i];
            if (pivot !== 1) {
                for (let k = i; k <= n; k++) {
                    Ab[i][k] /= pivot;
                }
                steps.push({
                    action: `Normalizar fila ${i+1}`,
                    matrix: cloneMatrix(Ab),
                    explanation: `F${i+1} ← F${i+1} ÷ ${pivot.toFixed(2)}`
                });
            }
            
            // Eliminación hacia adelante y atrás
            for (let j = 0; j < n; j++) {
                if (j !== i) {
                    const factor = Ab[j][i];
                    if (factor !== 0) {
                        for (let k = i; k <= n; k++) {
                            Ab[j][k] -= factor * Ab[i][k];
                        }
                        steps.push({
                            action: `Eliminación en fila ${j+1}`,
                            matrix: cloneMatrix(Ab),
                            explanation: `F${j+1} ← F${j+1} - (${factor.toFixed(2)}) × F${i+1}`
                        });
                    }
                }
            }
        }
        
        const x = Ab.map(row => row[n]);
        steps.push({
            action: 'Solución obtenida',
            matrix: null,
            explanation: `La matriz está en forma reducida. Solución: ${x.map((val, idx) => `x<sub>${idx+1}</sub> = ${val.toFixed(6)}`).join(', ')}`
        });
        
        return [x, steps];
    }
    
    // Método de Descomposición LU
    function luDecomposition(A, b, n) {
        const steps = [];
        const L = new Array(n).fill().map(() => new Array(n).fill(0));
        const U = new Array(n).fill().map(() => new Array(n).fill(0));
        
        steps.push({
            action: 'Inicio de descomposición LU',
            matrix: null,
            explanation: 'Comenzamos la descomposición de la matriz A en L (triangular inferior) y U (triangular superior).'
        });
        
        // Descomposición LU
        for (let i = 0; i < n; i++) {
            // Matriz U
            for (let k = i; k < n; k++) {
                let sum = 0;
                for (let j = 0; j < i; j++) {
                    sum += L[i][j] * U[j][k];
                }
                U[i][k] = A[i][k] - sum;
            }
            
            // Matriz L
            for (let k = i; k < n; k++) {
                if (i === k) {
                    L[i][i] = 1;
                } else {
                    let sum = 0;
                    for (let j = 0; j < i; j++) {
                        sum += L[k][j] * U[j][i];
                    }
                    L[k][i] = (A[k][i] - sum) / U[i][i];
                }
            }
            
            if (i < n-1) {
                steps.push({
                    action: `Paso ${i+1} de descomposición`,
                    matrix: null,
                    explanation: `L[${i+1}][${i+1}] = 1, U[${i+1}] calculado, columnas ${i+1} de L calculadas.`
                });
            }
        }
        
        steps.push({
            action: 'Descomposición LU completada',
            matrix: null,
            explanation: `Matriz L (triangular inferior con diagonal 1) y U (triangular superior) obtenidas.`
        });
        
        // Resolver Ly = b
        const y = new Array(n);
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < i; j++) {
                sum += L[i][j] * y[j];
            }
            y[i] = b[i] - sum;
        }
        
        steps.push({
            action: 'Sustitución hacia adelante',
            matrix: null,
            explanation: `Resolvemos Ly = b obteniendo y = [${y.map(v => v.toFixed(6)).join(', ')}]`
        });
        
        // Resolver Ux = y
        const x = new Array(n);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += U[i][j] * x[j];
            }
            x[i] = (y[i] - sum) / U[i][i];
        }
        
        steps.push({
            action: 'Sustitución hacia atrás',
            matrix: null,
            explanation: `Resolvemos Ux = y obteniendo la solución final: ${x.map((val, idx) => `x<sub>${idx+1}</sub> = ${val.toFixed(6)}`).join(', ')}`
        });
        
        return [x, steps];
    }
    
    // Regla de Cramer
    function cramerRule(A, b, n) {
        const steps = [];
        const detA = determinant(A, n);
        
        steps.push({
            action: 'Regla de Cramer',
            matrix: null,
            explanation: `Calculamos el determinante de A: det(A) = ${detA.toFixed(6)}`
        });
        
        if (detA === 0) {
            throw new Error("El sistema no tiene solución única (det(A) = 0)");
        }
        
        const x = new Array(n);
        for (let i = 0; i < n; i++) {
            const Ai = cloneMatrix(A);
            for (let j = 0; j < n; j++) {
                Ai[j][i] = b[j];
            }
            const detAi = determinant(Ai, n);
            x[i] = detAi / detA;
            
            steps.push({
                action: `Cálculo de x${i+1}`,
                matrix: null,
                explanation: `Reemplazamos columna ${i+1} con b, det(A${i+1}) = ${detAi.toFixed(6)}, x${i+1} = det(A${i+1})/det(A) = ${x[i].toFixed(6)}`
            });
        }
        
        return [x, steps];
    }
    
    // Función para calcular determinante
    function determinant(mat, n) {
        if (n === 1) return mat[0][0];
        if (n === 2) return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
        
        let det = 0;
        for (let i = 0; i < n; i++) {
            const subMat = new Array(n-1).fill().map(() => new Array(n-1));
            for (let j = 1; j < n; j++) {
                for (let k = 0, l = 0; k < n; k++) {
                    if (k !== i) {
                        subMat[j-1][l++] = mat[j][k];
                    }
                }
            }
            det += mat[0][i] * Math.pow(-1, i) * determinant(subMat, n-1);
        }
        return det;
    }
    
    // Función para mostrar resultados mejorados
    function displayResults(solution, steps) {
        resultsContainer.innerHTML = `
            <div class="alert alert-success">
                <h4>Solución encontrada:</h4>
                <ul class="solution-list">
                    ${solution.map((val, idx) => `
                        <li>x<sub>${idx+1}</sub> = <span class="solution-value">${val.toFixed(6)}</span></li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        // Mostrar pasos mejorados
        stepsContainer.innerHTML = '';
        steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'step-card mb-3';
            
            let stepHtml = `
                <div class="step-header">
                    <h5 class="step-number">Paso ${index + 1}</h5>
                    <h4 class="step-action">${step.action}</h4>
                </div>
                <div class="step-explanation">${step.explanation}</div>
            `;
            
            if (step.matrix) {
                stepHtml += `
                    <div class="matrix-preview">
                        <div class="matrix-container">
                            ${step.matrix.map(row => `
                                <div class="matrix-row">
                                    ${row.map((cell, i) => `
                                        <span class="matrix-cell ${i === size ? 'rhs-cell' : ''}">${cell.toFixed(2)}</span>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            stepElement.innerHTML = stepHtml;
            stepsContainer.appendChild(stepElement);
        });
    }
    
    // Funciones auxiliares
    function augmentedMatrix(A, b) {
        return A.map((row, i) => [...row, b[i]]);
    }
    
    function cloneMatrix(mat) {
        return mat.map(row => [...row]);
    }
});