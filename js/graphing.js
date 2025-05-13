// Reemplaza el contenido de graphing.js con este código

document.addEventListener('DOMContentLoaded', function() {
    // Configuración
    const DEFAULT_COLORS = [
        '#4285F4', // Azul
        '#EA4335', // Rojo
        '#FBBC05', // Amarillo
        '#34A853', // Verde
        '#673AB7', // Morado
        '#FF5722', // Naranja
        '#009688'  // Turquesa
    ];
    const TOLERANCE = 1e-6;
    const GEOGEBRA_STYLE = {
        gridColor: 'rgba(0, 0, 0, 0.15)',
        axisColor: '#000000',
        backgroundColor: '#ffffff',
        pointRadius: 4,
        lineWidth: 2
    };
    
    // Elementos del DOM
    const functionsList = document.getElementById('functions-list');
    const addFunctionBtn = document.getElementById('add-function-btn');
    const functionModal = new bootstrap.Modal('#function-modal');
    const saveFunctionBtn = document.getElementById('save-function');
    const functionForm = document.getElementById('function-form');
    const functionExpression = document.getElementById('function-expression');
    const functionColor = document.getElementById('function-color');
    const functionPreview = document.getElementById('function-preview');
    const modalKeyboardToggle = document.getElementById('modal-keyboard-toggle');
    const mathKeyboard = document.getElementById('math-keyboard');
    const keyboardClose = document.getElementById('keyboard-close');
    const ctx = document.getElementById('function-chart').getContext('2d');
    const gridToggle = document.getElementById('grid-toggle');
    const axesToggle = document.getElementById('axes-toggle');
    const pointsToggle = document.getElementById('points-toggle');
    const xMinInput = document.getElementById('x-min');
    const xMaxInput = document.getElementById('x-max');
    const yMinInput = document.getElementById('y-min');
    const yMaxInput = document.getElementById('y-max');
    const autoRangeBtn = document.getElementById('auto-range-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const resetViewBtn = document.getElementById('reset-view-btn');
    const coordinatesDisplay = document.getElementById('coordinates-display');
    
    // Variables globales
    let chart = null;
    let functions = [];
    let currentFunctionIndex = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // Inicializar la aplicación
    initMathKeyboard();
    initChart();
    loadSampleFunctions();
    setupEventListeners();
    
    function initMathKeyboard() {
        // Configurar teclado para el modal
        modalKeyboardToggle.addEventListener('click', function() {
            positionKeyboard(functionExpression);
            mathKeyboard.style.display = 'block';
            document.body.appendChild(mathKeyboard);
        });
    
        keyboardClose.addEventListener('click', function() {
            mathKeyboard.style.display = 'none';
        });
    
        // Configurar botones del teclado (versión mejorada)
        document.querySelectorAll('.keyboard-key').forEach(key => {
            key.addEventListener('mousedown', function(e) {
                e.preventDefault(); // Previene el comportamiento por defecto
                
                if (!functionExpression) return;
                
                // Enfocar el campo de entrada si no lo está
                if (document.activeElement !== functionExpression) {
                    functionExpression.focus();
                }
                
                // Manejar diferentes tipos de botones
                if (this.dataset.insert) {
                    insertAtCursor(functionExpression, this.dataset.insert);
                } else if (this.dataset.backspace) {
                    backspaceAtCursor(functionExpression);
                } else if (this.dataset.clear) {
                    functionExpression.value = '';
                }
                
                updateFunctionPreview();
                
                // Disparar evento input para notificar cambios
                const inputEvent = new Event('input', { bubbles: true });
                functionExpression.dispatchEvent(inputEvent);
            });
        });
    
        makeDraggable(mathKeyboard);
    }
    
    // Modifica la función positionKeyboard
    function positionKeyboard(inputElement) {
        const inputRect = inputElement.getBoundingClientRect();
        const modal = document.getElementById('function-modal');
        const modalRect = modal.getBoundingClientRect();
        
        // Posicionar el teclado relativo al viewport pero alineado con el modal
        mathKeyboard.style.top = `${inputRect.bottom + window.scrollY + 10}px`;
        mathKeyboard.style.left = `${inputRect.left + window.scrollX}px`;
        mathKeyboard.style.position = 'absolute';
        mathKeyboard.style.zIndex = '1060';
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
    if (!input) return;
    
    input.focus(); // Asegurar que el input tiene el foco
    
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    
    if (startPos === endPos && startPos > 0) {
        // Borrar un carácter atrás
        input.value = input.value.substring(0, startPos - 1) + input.value.substring(endPos);
        input.selectionStart = input.selectionEnd = startPos - 1;
    } else if (startPos !== endPos) {
        // Borrar selección
        input.value = input.value.substring(0, startPos) + input.value.substring(endPos);
        input.selectionStart = input.selectionEnd = startPos;
    }
    
    // Disparar evento de cambio
    const inputEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(inputEvent);
}
    
    function updateFunctionPreview() {
        const expr = functionExpression.value;
        
        try {
            const latexExpr = mathToLatex(expr);
            functionPreview.innerHTML = `\\( f(x) = ${latexExpr} \\)`;
            MathJax.typeset();
        } catch (e) {
            functionPreview.innerHTML = '<span class="text-danger">Expresión inválida</span>';
        }
    }
    
    function mathToLatex(expr) {
        if (!expr) return '';
        
        // Reemplazos básicos
        let latex = expr
            .replace(/\^/g, '^')
            .replace(/([a-zA-Z]+)\^(\d+)/g, '{$1}^{$2}')
            .replace(/\*/g, ' \\cdot ')
            .replace(/sin\(/g, '\\sin(')
            .replace(/cos\(/g, '\\cos(')
            .replace(/tan\(/g, '\\tan(')
            .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
            .replace(/log\(/g, '\\log(')
            .replace(/exp\(([^)]+)\)/g, 'e^{$1}')
            .replace(/pi/g, '\\pi')
            .replace(/\|([^|]+)\|/g, '\\left|$1\\right|')
            .replace(/(\d+)x/g, '$1x'); // Para coeficientes
        
        return latex;
    }
    
    function setupEventListeners() {
        // Botón para agregar función
        addFunctionBtn.addEventListener('click', function() {
            currentFunctionIndex = null;
            functionForm.reset();
            functionColor.value = DEFAULT_COLORS[functions.length % DEFAULT_COLORS.length];
            document.getElementById('modal-title').textContent = 'Agregar Nueva Función';
            functionModal.show();
        });
        
        // Guardar función
        saveFunctionBtn.addEventListener('click', saveFunction);
        
        // Actualizar vista previa al escribir
        functionExpression.addEventListener('input', updateFunctionPreview);
        
        // Controles del gráfico
        gridToggle.addEventListener('change', updateChartOptions);
        axesToggle.addEventListener('change', updateChartOptions);
        pointsToggle.addEventListener('change', updateChartOptions);
        
        // Rango del gráfico
        xMinInput.addEventListener('change', updateChartRange);
        xMaxInput.addEventListener('change', updateChartRange);
        yMinInput.addEventListener('change', updateChartRange);
        yMaxInput.addEventListener('change', updateChartRange);
        
        // Botones de zoom
        zoomInBtn.addEventListener('click', () => {
            chart.zoom(1.2);
            chart.update();
        });
        
        zoomOutBtn.addEventListener('click', () => {
            chart.zoom(0.8);
            chart.update();
        });
        resetViewBtn.addEventListener('click', resetChartView);
        
        // Ajuste automático de rango
        autoRangeBtn.addEventListener('click', autoRange);
        
        // Mostrar coordenadas del mouse
        ctx.canvas.addEventListener('mousemove', showCoordinates);
        ctx.canvas.addEventListener('mouseout', () => {
            coordinatesDisplay.textContent = 'x: 0.00, y: 0.00';
        });
    }
    
    function initChart() {
        // Configuración del gráfico estilo GeoGebra
        chart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [] },
            options: getChartOptions()
        });
    }
    
    function getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: {
                    type: 'linear',
                    position: 'center',
                    min: parseFloat(xMinInput.value),
                    max: parseFloat(xMaxInput.value),
                    grid: {
                        color: gridToggle.checked ? GEOGEBRA_STYLE.gridColor : 'transparent',
                        drawBorder: axesToggle.checked,
                        lineWidth: 1
                    },
                    ticks: {
                        callback: function(value) {
                            return value % 1 === 0 ? value : value.toFixed(1);
                        },
                        color: '#000',
                        font: {
                            family: 'Arial, sans-serif',
                            size: 12
                        }
                    },
                    title: {
                        display: axesToggle.checked,
                        text: 'x',
                        color: '#000',
                        font: {
                            family: 'Arial, sans-serif',
                            size: 14,
                            weight: 'bold'
                        }
                    }
                    
                },
                y: {
                    type: 'linear',
                    position: 'center',
                    min: parseFloat(yMinInput.value),
                    max: parseFloat(yMaxInput.value),
                    grid: {
                        color: gridToggle.checked ? GEOGEBRA_STYLE.gridColor : 'transparent',
                        drawBorder: axesToggle.checked,
                        lineWidth: 1
                    },
                    ticks: {
                        callback: function(value) {
                            return value % 1 === 0 ? value : value.toFixed(1);
                        },
                        color: '#000',
                        font: {
                            family: 'Arial, sans-serif',
                            size: 12
                        }
                    },
                    title: {
                        display: axesToggle.checked,
                        text: 'y',
                        color: '#000',
                        font: {
                            family: 'Arial, sans-serif',
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
                            return `${context.dataset.label}: (${context.parsed.x.toFixed(3)}, ${context.parsed.y.toFixed(3)})`;
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        family: 'Arial, sans-serif',
                        size: 14
                    },
                    bodyFont: {
                        family: 'Arial, sans-serif',
                        size: 12
                    }
                },
                zoom: {
                    limits: {
                        x: {min: 'original', max: 'original'},
                        y: {min: 'original', max: 'original'}
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        threshold: 10
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                        onZoomComplete: ({chart}) => {
                            // Actualizar los inputs de rango al hacer zoom
                            const xScale = chart.scales.x;
                            const yScale = chart.scales.y;
                            xMinInput.value = xScale.min.toFixed(1);
                            xMaxInput.value = xScale.max.toFixed(1);
                            yMinInput.value = yScale.min.toFixed(1);
                            yMaxInput.value = yScale.max.toFixed(1);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            elements: {
                line: { 
                    tension: 0,
                    borderWidth: GEOGEBRA_STYLE.lineWidth,
                    borderCapStyle: 'round'
                },
                point: {
                    radius: 0,
                    hoverRadius: 5
                }
            }
        };
    }
    
    function loadSampleFunctions() {
        // Agregar algunas funciones de ejemplo
        addFunction('sin(x)', '#4285F4');
        addFunction('x^2 - 4', '#EA4335');
    }
    
    function addFunction(expression, color) {
        const func = {
            expression,
            color,
            points: []
        };
        
        functions.push(func);
        renderFunctionList();
        plotAllFunctions();
    }
    
    function renderFunctionList() {
        functionsList.innerHTML = '';
        
        functions.forEach((func, index) => {
            const funcElement = document.createElement('div');
            funcElement.className = 'function-item';
            funcElement.innerHTML = `
                <div>
                    <span class="function-color" style="background-color: ${func.color}"></span>
                    <span>${func.expression}</span>
                </div>
                <div class="function-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-function" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-function" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            functionsList.appendChild(funcElement);
        });
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-function').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                editFunction(index);
            });
        });
        
        document.querySelectorAll('.delete-function').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                deleteFunction(index);
            });
        });
    }
    
    function editFunction(index) {
        currentFunctionIndex = index;
        const func = functions[index];
        
        functionExpression.value = func.expression;
        functionColor.value = func.color;
        document.getElementById('modal-title').textContent = 'Editar Función';
        
        updateFunctionPreview();
        functionModal.show();
    }
    
    function deleteFunction(index) {
        functions.splice(index, 1);
        renderFunctionList();
        plotAllFunctions();
    }
    
    function saveFunction() {
        const expression = functionExpression.value.trim();
        const color = functionColor.value;
        
        if (!expression) {
            alert('Por favor ingrese una expresión válida');
            return;
        }
        
        try {
            // Validar la expresión
            math.evaluate(expression, {x: 1});
            
            if (currentFunctionIndex !== null) {
                // Editar función existente
                functions[currentFunctionIndex].expression = expression;
                functions[currentFunctionIndex].color = color;
            } else {
                // Agregar nueva función
                addFunction(expression, color);
            }
            
            functionModal.hide();
        } catch (error) {
            alert('Expresión inválida: ' + error.message);
        }
    }
    
    function plotAllFunctions() {
        if (!chart) return;
        
        const datasets = [];
        const xMin = parseFloat(xMinInput.value);
        const xMax = parseFloat(xMaxInput.value);
        const step = (xMax - xMin) / 500;
        
        // Agregar eje X
        if (axesToggle.checked) {
            datasets.push({
                label: 'Eje X',
                data: [{x: xMin, y: 0}, {x: xMax, y: 0}],
                borderColor: GEOGEBRA_STYLE.axisColor,
                borderWidth: 1,
                pointRadius: 0,
                showLine: true
            });
            
            // Agregar eje Y
            const yMin = parseFloat(yMinInput.value);
            const yMax = parseFloat(yMaxInput.value);
            datasets.push({
                label: 'Eje Y',
                data: [{x: 0, y: yMin}, {x: 0, y: yMax}],
                borderColor: GEOGEBRA_STYLE.axisColor,
                borderWidth: 1,
                pointRadius: 0,
                showLine: true
            });
        }
        
        // Procesar cada función
        functions.forEach((func, index) => {
            const xValues = [];
            const yValues = [];
            
            // Calcular puntos
            for (let x = xMin; x <= xMax; x += step) {
                try {
                    const y = math.evaluate(func.expression, {x});
                    if (typeof y === 'number' && isFinite(y)) {
                        xValues.push(x);
                        yValues.push(y);
                    }
                } catch (e) {
                    // Ignorar puntos no válidos
                }
            }
            
            // Dataset para la línea de la función
            datasets.push({
                label: func.expression,
                data: xValues.map((x, i) => ({x, y: yValues[i]})),
                borderColor: func.color,
                backgroundColor: 'transparent',
                borderWidth: GEOGEBRA_STYLE.lineWidth,
                pointRadius: 0,
                tension: 0,
                fill: false,
                showLine: true
            });
            
            // Encontrar y marcar puntos clave si está habilitado
            if (pointsToggle.checked) {
                const keyPoints = findKeyPoints(func.expression, xMin, xMax);
                
                if (keyPoints.length > 0) {
                    datasets.push({
                        label: `Puntos clave: ${func.expression}`,
                        data: keyPoints,
                        backgroundColor: func.color,
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        pointRadius: GEOGEBRA_STYLE.pointRadius,
                        pointHoverRadius: GEOGEBRA_STYLE.pointRadius + 2,
                        showLine: false
                    });
                }
            }
        });
        
        chart.data.datasets = datasets;
        chart.update();
    }
    
    function findKeyPoints(expression, xMin, xMax) {
        const points = [];
        const step = (xMax - xMin) / 1000;
        const h = 1e-5; // Para derivadas
        
        // Función evaluable
        const f = (x) => {
            try {
                return math.evaluate(expression, {x});
            } catch {
                return NaN;
            }
        };
        
        // Buscar raíces, máximos y mínimos
        let prevX = xMin;
        let prevY = f(xMin);
        let prevDy = (f(xMin + h) - f(xMin - h)) / (2 * h);
        
        for (let x = xMin + step; x <= xMax; x += step) {
            const y = f(x);
            if (isNaN(y)) continue;
            
            const dy = (f(x + h) - f(x - h)) / (2 * h);
            if (isNaN(dy)) continue;
            
            // Raíces (cambio de signo)
            if (prevY * y <= 0 && !isNaN(prevY)) {
                const root = refineRoot(f, prevX, x);
                if (root !== null) {
                    points.push({x: root, y: 0});
                }
            }
            
            // Extremos (cambio de signo en derivada)
            if (prevDy * dy <= 0 && Math.abs(dy) < 1 && !isNaN(prevDy)) {
                const extX = refineExtremum(f, prevX, x, h);
                if (extX !== null) {
                    const extY = f(extX);
                    if (!isNaN(extY)) {
                        points.push({x: extX, y: extY});
                    }
                }
            }
            
            prevX = x;
            prevY = y;
            prevDy = dy;
        }
        
        return points;
    }
    
    function refineRoot(f, a, b) {
        // Primero verificar si ya estamos en una raíz
        if (Math.abs(f(a)) < TOLERANCE) return a;
        if (Math.abs(f(b)) < TOLERANCE) return b;
        
        // Método de bisección
        for (let i = 0; i < 20; i++) {
            const c = (a + b) / 2;
            const fc = f(c);
            
            if (Math.abs(fc) < TOLERANCE || (b - a)/2 < TOLERANCE) {
                return c;
            }
            
            if (fc * f(a) < 0) {
                b = c;
            } else {
                a = c;
            }
        }
        
        return (a + b) / 2;
    }
    
    function refineExtremum(f, a, b, h) {
        // Método de Newton para encontrar donde f'(x) = 0
        let x = (a + b) / 2;
        
        for (let i = 0; i < 20; i++) {
            const df = (f(x + h) - f(x - h)) / (2 * h);
            const d2f = (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
            
            if (Math.abs(d2f) < 1e-10) break;
            
            const xNew = x - df / d2f;
            
            if (Math.abs(xNew - x) < TOLERANCE) return xNew;
            x = xNew;
        }
        
        return x;
    }
    
    function updateChartOptions() {
        chart.options.scales.x.grid.color = gridToggle.checked ? GEOGEBRA_STYLE.gridColor : 'transparent';
        chart.options.scales.y.grid.color = gridToggle.checked ? GEOGEBRA_STYLE.gridColor : 'transparent';
        chart.options.scales.x.title.display = axesToggle.checked;
        chart.options.scales.y.title.display = axesToggle.checked;
        chart.options.scales.x.grid.drawBorder = axesToggle.checked;
        chart.options.scales.y.grid.drawBorder = axesToggle.checked;
        
        plotAllFunctions(); // Para actualizar puntos clave
    }
    
    function updateChartRange() {
        chart.options.scales.x.min = parseFloat(xMinInput.value);
        chart.options.scales.x.max = parseFloat(xMaxInput.value);
        chart.options.scales.y.min = parseFloat(yMinInput.value);
        chart.options.scales.y.max = parseFloat(yMaxInput.value);
        chart.update();
    }
    
    function resetChartView() {
        chart.resetZoom();
        updateChartRange();
    }
    
    function autoRange() {
        if (functions.length === 0) return;
        
        let xMin = parseFloat(xMinInput.value);
        let xMax = parseFloat(xMaxInput.value);
        let yMin = Infinity;
        let yMax = -Infinity;
        
        // Calcular rango y basado en las funciones
        const step = (xMax - xMin) / 100;
        
        functions.forEach(func => {
            const f = (x) => {
                try {
                    return math.evaluate(func.expression, {x});
                } catch {
                    return NaN;
                }
            };
            
            for (let x = xMin; x <= xMax; x += step) {
                const y = f(x);
                if (typeof y === 'number' && isFinite(y)) {
                    if (y < yMin) yMin = y;
                    if (y > yMax) yMax = y;
                }
            }
        });
        
        // Ajustar el rango y para que no sea demasiado plano
        const yRange = yMax - yMin;
        if (yRange < 1) {
            const padding = (1 - yRange) / 2;
            yMin -= padding;
            yMax += padding;
        }
        
        // Aplicar el nuevo rango
        yMinInput.value = Math.floor(yMin * 10) / 10;
        yMaxInput.value = Math.ceil(yMax * 10) / 10;
        updateChartRange();
    }
    
    function showCoordinates(event) {
        if (!chart) return;
        
        const rect = ctx.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Obtener los elementos bajo el puntero
        const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
        
        // Solo mostrar coordenadas si estamos sobre un elemento del gráfico
        if (elements.length > 0) {
            const xValue = chart.scales.x.getValueForPixel(x);
            const yValue = chart.scales.y.getValueForPixel(y);
            coordinatesDisplay.textContent = `x: ${xValue.toFixed(2)}, y: ${yValue.toFixed(2)}`;
        } else {
            coordinatesDisplay.textContent = 'x: 0.00, y: 0.00';
        }
    }
});