document.addEventListener('DOMContentLoaded', function() {
    // Configuración
    const TOLERANCE = 1e-8;
    const MAX_ITERATIONS = 100;
    const DEFAULT_STEP = 0.01;
    const ROOT_POINT_SIZE = 6;
    
    // Elementos del DOM
    const functionInput = document.getElementById('function-input');
    const rootForm = document.getElementById('root-form');
    const resultsContainer = document.getElementById('results-container');
    const mathKeyboard = document.getElementById('math-keyboard');
    const keyboardToggle = document.getElementById('math-keyboard-toggle');
    const keyboardClose = document.getElementById('keyboard-close');
    const gridToggle = document.getElementById('grid-toggle');
    const ctx = document.getElementById('function-chart').getContext('2d');
    
    // Variables globales
    let chart = null;
    let isDragging = false;
    let dragStartX = 0;
    let currentScale = 1;
    let currentXCenter = 0;
    let currentYCenter = 0;
    
    // Inicializar teclado matemático
    function initMathKeyboard() {
        keyboardToggle.addEventListener('click', function() {
            mathKeyboard.style.display = 'block';
            positionKeyboard();
        });
        
        keyboardClose.addEventListener('click', function() {
            mathKeyboard.style.display = 'none';
        });
        
        document.querySelectorAll('.keyboard-key').forEach(key => {
            key.addEventListener('click', function() {
                if (this.dataset.insert) {
                    insertAtCursor(functionInput, this.dataset.insert);
                } else if (this.dataset.backspace) {
                    backspaceAtCursor(functionInput);
                } else if (this.dataset.clear) {
                    functionInput.value = '';
                }
                updateFunctionPreview();
                functionInput.focus();
            });
        });
        
        // Hacer el teclado arrastrable
        makeDraggable(mathKeyboard);
    }
    
    function positionKeyboard() {
        const inputRect = functionInput.getBoundingClientRect();
        mathKeyboard.style.top = `${inputRect.bottom + 10}px`;
        mathKeyboard.style.left = `${inputRect.left}px`;
    }
    
    function makeDraggable(element) {
        const header = element.querySelector('.keyboard-header');
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        header.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    function insertAtCursor(input, text) {
        const startPos = input.selectionStart;
        const endPos = input.selectionEnd;
        input.value = input.value.substring(0, startPos) + text + input.value.substring(endPos);
        input.selectionStart = input.selectionEnd = startPos + text.length;
    }
    
    function backspaceAtCursor(input) {
        const startPos = input.selectionStart;
        const endPos = input.selectionEnd;
        
        if (startPos === endPos && startPos > 0) {
            input.value = input.value.substring(0, startPos - 1) + input.value.substring(endPos);
            input.selectionStart = input.selectionEnd = startPos - 1;
        } else {
            input.value = input.value.substring(0, startPos) + input.value.substring(endPos);
            input.selectionStart = input.selectionEnd = startPos;
        }
    }
    
    // Actualizar vista previa de la función
    function updateFunctionPreview() {
        const func = functionInput.value;
        const preview = document.getElementById('function-preview');
        
        try {
            const latexFunc = mathToLatex(func);
            preview.innerHTML = `\\( f(x) = ${latexFunc} \\)`;
            MathJax.typeset();
        } catch (e) {
            preview.innerHTML = '<span class="text-danger">Expresión inválida</span>';
        }
    }
    
    function mathToLatex(expr) {
        return expr
            .replace(/\^/g, '^')
            .replace(/(\w+)\^(\d+)/g, '$1^{$2}')
            .replace(/\*/g, '\\cdot ')
            .replace(/sin\(/g, '\\sin(')
            .replace(/cos\(/g, '\\cos(')
            .replace(/tan\(/g, '\\tan(')
            .replace(/sqrt\(/g, '\\sqrt{')
            .replace(/log\(/g, '\\log(')
            .replace(/exp\(/g, 'e^{')
            .replace(/pi/g, '\\pi')
            .replace(/e\^\{([^}]+)\}\(/g, '\\exp($1)(') // Manejar exp(x) correctamente
            .replace(/\|([^|]+)\|/g, '\\left|$1\\right|');
    }
    
    // Manejar envío del formulario
    rootForm.addEventListener('submit', function(e) {
        e.preventDefault();
        findRoots();
    });
    
    // Función principal para buscar raíces
    function findRoots() {
        const funcStr = functionInput.value.toLowerCase();
        const a = parseFloat(document.getElementById('a-value').value);
        const b = parseFloat(document.getElementById('b-value').value);
        
        try {
            const func = (x) => math.evaluate(funcStr, {x});
            
            // Manejo especial para funciones periódicas
            if (funcStr.includes('tan(')) {
                const period = Math.PI; // Periodo de tan(x)
                let roots = [];
                
                // Buscar raíces en cada periodo
                for (let x = Math.ceil(a/period)*period; x <= b; x += period) {
                    const root = refineRoot(func, x - period/2, x + period/2);
                    if (root !== null && !roots.some(r => Math.abs(r - root) < TOLERANCE)) {
                        roots.push(root);
                    }
                }
                
                displayResults(roots, func);
                plotFunction(func, a, b, roots);
            } else {
                // Método normal para otras funciones
                const roots = findAllRoots(func, a, b);
                displayResults(roots, func);
                plotFunction(func, a, b, roots);
            }
        } catch (error) {
            showError(error.message);
        }
    }
    
    // Algoritmo mejorado para encontrar todas las raíces
    function findAllRoots(f, a, b) {
        const roots = [];
        const step = (b - a) / 1000; // Paso más fino para funciones periódicas
        
        let prevX = a;
        let prevY = safeEval(f, a);
        if (Math.abs(prevY) < TOLERANCE) roots.push(a);
        
        for (let x = a + step; x <= b; x += step) {
            const y = safeEval(f, x);
            
            // Si hay un cambio de signo o paso por cero
            if (prevY * y <= 0) {
                // Verificar si no es una asíntota (cambio abrupto)
                if (Math.abs(y - prevY) < 1e6) { // Umbral para detectar discontinuidades
                    const root = refineRoot(f, prevX, x);
                    if (root !== null && !roots.some(r => Math.abs(r - root) < TOLERANCE)) {
                        roots.push(root);
                    }
                }
            }
            
            prevX = x;
            prevY = y;
        }
        
        return roots.sort((a, b) => a - b);
    }
    
    function safeEval(f, x) {
        try {
            return f(x);
        } catch {
            return NaN;
        }
    }
    
    // Combinación de métodos para refinar la raíz
    function refineRoot(f, a, b) {
        // Primero verificar si ya estamos en una raíz
        const fa = f(a);
        if (Math.abs(fa) < TOLERANCE) return a;
        
        const fb = f(b);
        if (Math.abs(fb) < TOLERANCE) return b;
        
        // Intentar con Newton-Raphson (más rápido si converge)
        const x0 = (a + b) / 2;
        const newtonResult = newtonRaphson(f, x0);
        if (newtonResult !== null) return newtonResult;
        
        // Si Newton falla, usar Bisección (más lento pero seguro)
        return bisection(f, a, b);
    }
    
    // Método de Newton-Raphson mejorado
    function newtonRaphson(f, x0) {
        const h = 1e-5; // Para derivada numérica
        let x = x0;
        let iterations = 0;
        
        while (iterations < MAX_ITERATIONS) {
            const fx = f(x);
            if (Math.abs(fx) < TOLERANCE) return x;
            
            // Derivada numérica con protección contra división por cero
            const dfx = (f(x + h) - f(x - h)) / (2 * h);
            if (Math.abs(dfx) < 1e-10) break;
            
            const xNew = x - fx / dfx;
            
            if (Math.abs(xNew - x) < TOLERANCE) return xNew;
            x = xNew;
            iterations++;
        }
        
        return null;
    }
    
    // Método de Bisección mejorado
    function bisection(f, a, b) {
        let fa = f(a);
        let fb = f(b);
    
        if (isNaN(fa) || isNaN(fb)) return null;
        if (fa * fb > 0) return null; // No hay cambio de signo
    
        let mid;
        let fmid;
        let iterations = 0;
    
        while ((b - a) / 2 > TOLERANCE && iterations < MAX_ITERATIONS) {
            mid = (a + b) / 2;
            fmid = f(mid);
    
            if (Math.abs(fmid) < TOLERANCE) return mid;
    
            if (fa * fmid < 0) {
                b = mid;
                fb = fmid;
            } else {
                a = mid;
                fa = fmid;
            }
    
            iterations++;
        }
    
        return (a + b) / 2;
    }
    
    // Mostrar resultados mejorados
    function displayResults(roots, f) {
        if (roots.length === 0) {
            resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-circle"></i> No se encontraron raíces en el intervalo especificado.
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="alert alert-success">
                <h4><i class="fas fa-check-circle"></i> Raíces encontradas:</h4>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Raíz</th>
                                <th>Valor</th>
                                <th>f(x)</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        roots.forEach((root, i) => {
            const fx = f(root);
            // Mostrar como 0.00 si el valor es muy cercano a cero
            const fxDisplay = Math.abs(fx) < TOLERANCE ? '0.00' : fx.toExponential(2);
            
            html += `
                <tr>
                    <td><strong>x<sub>${i+1}</sub></strong></td>
                    <td>${root.toFixed(6)}</td>
                    <td class="${Math.abs(fx) < TOLERANCE ? 'text-success' : 'text-warning'}">
                        ${fxDisplay}
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-2 text-end">
                    <small class="text-muted">Tolerancia: ${TOLERANCE.toExponential()}</small>
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    }
    
    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> <strong>Error:</strong> ${message}
            </div>
        `;
    }
    
    // Graficar función con estilo GeoGebra
    function plotFunction(f, a, b, roots) {
        // Calcular rango automático para y
        let yMin = Infinity, yMax = -Infinity;
        const xValues = [];
        const yValues = [];
        const step = (b - a) / 300;
        
        for (let x = a; x <= b; x += step) {
            const y = safeEval(f, x);
            if (!isNaN(y)) {
                xValues.push(x);
                yValues.push(y);
                if (y < yMin) yMin = y;
                if (y > yMax) yMax = y;
            }
        }
        
        // Ajustar rango y para que no sea demasiado plano
        const yRange = yMax - yMin;
        if (yRange < 1) {
            const padding = (1 - yRange) / 2;
            yMin -= padding;
            yMax += padding;
        }
        
        // Configurar puntos de raíces
        const rootPoints = roots
            .filter(root => root >= a && root <= b)
            .map(root => ({
                x: root,
                y: 0
            }));
        
        // Destruir gráfico anterior si existe
        if (chart) chart.destroy();
        
        // Crear nuevo gráfico con estilo GeoGebra
        chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'f(x)',
                        data: xValues.map((x, i) => ({x, y: yValues[i]})),
                        borderColor: '#4285F4',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1,
                        fill: false,
                        showLine: true
                    },
                    {
                        label: 'Raíces',
                        data: rootPoints,
                        backgroundColor: '#EA4335',
                        borderColor: '#EA4335',
                        pointRadius: ROOT_POINT_SIZE,
                        pointHoverRadius: ROOT_POINT_SIZE + 2,
                        showLine: false
                    },
                    {
                        label: 'Eje X',
                        data: [{x: a, y: 0}, {x: b, y: 0}],
                        borderColor: '#000000',
                        borderWidth: 1,
                        pointRadius: 0,
                        showLine: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'center',
                        min: a,
                        max: b,
                        grid: {
                            color: gridToggle.checked ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                            drawBorder: true,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#333',
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            callback: function(value) {
                                return value % 1 === 0 ? value : value.toFixed(1);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Eje X',
                            color: '#000',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'center',
                        min: yMin,
                        max: yMax,
                        grid: {
                            color: gridToggle.checked ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                            drawBorder: true,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#333',
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            callback: function(value) {
                                return value % 1 === 0 ? value : value.toFixed(1);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Eje Y',
                            color: '#000',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `f(${context.parsed.x.toFixed(3)}) = ${context.parsed.y.toFixed(3)}`;
                                } else if (context.datasetIndex === 1) {
                                    return `Raíz: x ≈ ${context.parsed.x.toFixed(3)}`;
                                }
                                return '';
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy',
                            threshold: 10
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy',
                            speed: 0.1
                        }
                    }
                },
                interaction: {
                    intersect: true,  
                    mode: 'point'    
                },
                elements: {
                    line: {
                        tension: 0 // líneas rectas entre puntos
                    }
                }
            }
        });
        
        // Manejar el toggle de la cuadrícula
        gridToggle.addEventListener('change', function() {
            chart.options.scales.x.grid.color = this.checked ? 'rgba(0, 0, 0, 0.1)' : 'transparent';
            chart.options.scales.y.grid.color = this.checked ? 'rgba(0, 0, 0, 0.1)' : 'transparent';
            chart.update();
        });
    }
    
    // Inicializar la aplicación
    initMathKeyboard();
    updateFunctionPreview();
    
    // Redibujar el gráfico cuando cambia el tamaño de la ventana
    window.addEventListener('resize', function() {
        if (chart) {
            chart.resize();
        }
    });
});