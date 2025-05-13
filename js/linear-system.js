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
                
                // Valores por defecto para ejemplo (sistema de la imagen)
                if (size === 3) {
                    if (i === 0) input.value = j === 0 ? '4' : j === 1 ? '1' : j === 2 ? '-1' : '5';
                    if (i === 1) input.value = j === 0 ? '1' : j === 1 ? '5' : j === 2 ? '2' : '10';
                    if (i === 2) input.value = j === 0 ? '0' : j === 1 ? '1' : j === 2 ? '3' : '5';
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
                case 'jacobi':
                    [solution, steps] = jacobiMethod(A, b, n);
                    break;
                case 'gauss-seidel':
                    [solution, steps] = gaussSeidelMethod(A, b, n);
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
    
    // Método de Eliminación Gaussiana con pasos como ecuaciones
    function gaussianElimination(A, b, n) {
        const steps = [];
        const Ab = augmentedMatrix(A, b);
        
        // Mostrar sistema inicial
        steps.push({
            action: 'Sistema inicial',
            matrix: cloneMatrix(Ab),
            explanation: 'Sistema de ecuaciones original:'
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
                    action: 'Pivoteo',
                    matrix: cloneMatrix(Ab),
                    explanation: `Intercambiamos ecuación ${i+1} con ecuación ${maxRow+1} para tener el mayor pivote.`
                });
            }
            
            // Eliminación
            for (let j = i + 1; j < n; j++) {
                const factor = Ab[j][i] / Ab[i][i];
                let explanation = `Ecuación ${j+1} ← Ecuación ${j+1} - (${factor.toFixed(2)}) × Ecuación ${i+1}`;
                
                // Mostrar antes de modificar
                steps.push({
                    action: 'Operación de eliminación',
                    matrix: cloneMatrix(Ab),
                    explanation: explanation
                });
                
                for (let k = i; k <= n; k++) {
                    Ab[j][k] -= factor * Ab[i][k];
                }
                
                // Mostrar después de modificar
                steps.push({
                    action: 'Resultado de eliminación',
                    matrix: cloneMatrix(Ab),
                    explanation: `Nuevo sistema después de la operación:`
                });
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
            
            steps.push({
                action: 'Sustitución',
                matrix: null,
                explanation: `Despejando x<sub>${i+1}</sub> = ${x[i].toFixed(6)}`
            });
        }
        
        steps.push({
            action: 'Solución final',
            matrix: null,
            explanation: `Solución del sistema: ${x.map((val, idx) => `x<sub>${idx+1}</sub> = ${val.toFixed(6)}`).join(', ')}`
        });
        
        return [x, steps];
    }
    
    // Método de Gauss-Jordan con pasos como ecuaciones
    function gaussJordan(A, b, n) {
        const steps = [];
        const Ab = augmentedMatrix(A, b);
        
        steps.push({
            action: 'Sistema inicial',
            matrix: cloneMatrix(Ab),
            explanation: 'Sistema de ecuaciones original:'
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
                    action: 'Pivoteo',
                    matrix: cloneMatrix(Ab),
                    explanation: `Intercambiamos ecuación ${i+1} con ecuación ${maxRow+1}`
                });
            }
            
            // Normalizar fila
            const pivot = Ab[i][i];
            if (pivot !== 1) {
                for (let k = i; k <= n; k++) {
                    Ab[i][k] /= pivot;
                }
                steps.push({
                    action: 'Normalización',
                    matrix: cloneMatrix(Ab),
                    explanation: `Dividimos la ecuación ${i+1} por ${pivot.toFixed(2)}`
                });
            }
            
            // Eliminación en otras filas
            for (let j = 0; j < n; j++) {
                if (j !== i && Ab[j][i] !== 0) {
                    const factor = Ab[j][i];
                    let explanation = `Ecuación ${j+1} ← Ecuación ${j+1} - (${factor.toFixed(2)}) × Ecuación ${i+1}`;
                    
                    steps.push({
                        action: 'Eliminación',
                        matrix: cloneMatrix(Ab),
                        explanation: explanation
                    });
                    
                    for (let k = i; k <= n; k++) {
                        Ab[j][k] -= factor * Ab[i][k];
                    }
                    
                    steps.push({
                        action: 'Resultado',
                        matrix: cloneMatrix(Ab),
                        explanation: `Sistema después de la operación:`
                    });
                }
            }
        }
        
        const x = Ab.map(row => row[n]);
        steps.push({
            action: 'Solución final',
            matrix: null,
            explanation: `Solución del sistema: ${x.map((val, idx) => `x<sub>${idx+1}</sub> = ${val.toFixed(6)}`).join(', ')}`
        });
        
        return [x, steps];
    }
    function isDiagonallyDominant(A) {
        const n = A.length;
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (j !== i) sum += Math.abs(A[i][j]);
            }
            if (Math.abs(A[i][i]) <= sum) return false;
        }
        return true;
    }
    // Método de Jacobi con pasos detallados
    function jacobiMethod(A, b, n, maxIterations = 100, tolerance = 1e-6) {
        const steps = [];
        let x = new Array(n).fill(0);
        let xNew = new Array(n).fill(0);
        let iteration = 0;
        let error = Infinity;
        
        // Advertencia si no es diagonalmente dominante
        if (!isDiagonallyDominant(A)) {
            steps.push({
                action: 'Advertencia',
                matrix: null,
                explanation: '⚠️ La matriz no es diagonalmente dominante. La convergencia no está garantizada.'
            });
        }
        
        while (iteration < maxIterations && error > tolerance) {
            error = 0;
            
            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    if (j !== i) sum += A[i][j] * x[j];
                }
                xNew[i] = (b[i] - sum) / A[i][i];
                error = Math.max(error, Math.abs(xNew[i] - x[i]));
            }
            
            steps.push({
                action: `Iteración ${iteration + 1}`,
                matrix: null,
                explanation: `Valores actuales: ${xNew.map((v, i) => `x<sub>${i+1}</sub> = ${v.toFixed(6)}`).join(', ')}`
            });
            
            x = [...xNew];
            iteration++;
        }
        
        if (error <= tolerance) {
            steps.push({
                action: 'Convergencia',
                matrix: null,
                explanation: `✅ Convergió en ${iteration} iteraciones con error ${error.toExponential(2)}`
            });
        } else {
            steps.push({
                action: 'Advertencia',
                matrix: null,
                explanation: `⚠️ No convergió después de ${maxIterations} iteraciones (error = ${error.toExponential(2)})`
            });
        }
        
        return [x, steps];
    }
    
    // Método de Gauss-Seidel con pasos detallados
    function gaussSeidelMethod(A, b, n, maxIterations = 100, tolerance = 1e-6) {
        const steps = [];
        let x = new Array(n).fill(0);
        let iteration = 0;
        let error = Infinity;
        
        // Advertencia si no es diagonalmente dominante
        if (!isDiagonallyDominant(A)) {
            steps.push({
                action: 'Advertencia',
                matrix: null,
                explanation: '⚠️ La matriz no es diagonalmente dominante. La convergencia no está garantizada.'
            });
        }
        
        while (iteration < maxIterations && error > tolerance) {
            error = 0;
            
            for (let i = 0; i < n; i++) {
                const oldVal = x[i];
                let sum = 0;
                
                for (let j = 0; j < n; j++) {
                    if (j !== i) sum += A[i][j] * x[j];
                }
                
                x[i] = (b[i] - sum) / A[i][i];
                error = Math.max(error, Math.abs(x[i] - oldVal));
            }
            
            steps.push({
                action: `Iteración ${iteration + 1}`,
                matrix: null,
                explanation: `Valores actuales: ${x.map((v, i) => `x<sub>${i+1}</sub> = ${v.toFixed(6)}`).join(', ')}`
            });
            
            iteration++;
        }
        
        if (error <= tolerance) {
            steps.push({
                action: 'Convergencia',
                matrix: null,
                explanation: `✅ Convergió en ${iteration} iteraciones con error ${error.toExponential(2)}`
            });
        } else {
            steps.push({
                action: 'Advertencia',
                matrix: null,
                explanation: `⚠️ No convergió después de ${maxIterations} iteraciones (error = ${error.toExponential(2)})`
            });
        }
        
        return [x, steps];
    }
    
    // Función para mostrar resultados con formato de ecuaciones
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
        
        stepsContainer.innerHTML = '';
        steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'step-card mb-3 p-3 border rounded bg-light';
            
            let stepHtml = `
                <div class="step-header mb-2">
                    <h5 class="step-number">Paso ${index + 1}: ${step.action}</h5>
                </div>
                <div class="step-explanation mb-2">${step.explanation}</div>
            `;
            
            if (step.matrix) {
                // Formatear como sistema de ecuaciones
                const equations = step.matrix.map(row => {
                    const terms = [];
                    for (let j = 0; j < size; j++) {
                        const coef = row[j];
                        if (coef !== 0) {
                            terms.push(`${coef === 1 ? '' : coef === -1 ? '-' : coef.toFixed(2)}x_{${j+1}}`);
                        }
                    }
                    const equation = terms.join(' + ').replace(/\+ -/g, '- ') + ` = ${row[size].toFixed(2)}`;
                    return equation;
                });
                
                stepHtml += `
                    <div class="equation-system">
                        \\[\\begin{cases}
                        ${equations.join(' \\\\ ')}
                        \\end{cases}\\]
                    </div>
                `;
            }
            
            stepElement.innerHTML = stepHtml;
            stepsContainer.appendChild(stepElement);
            
            // Renderizar MathJax
            if (window.MathJax) {
                MathJax.typesetPromise([stepElement]).catch(err => console.log('MathJax error:', err));
            }
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