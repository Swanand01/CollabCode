const canvasContainer = document.querySelector("#canvasContainer")
let canvasBounds = canvasContainer.getBoundingClientRect()

const drawingCursor = document.querySelector('#drawing-cursor')
let cursorBounds = drawingCursor.getBoundingClientRect()

let paintObject = { path: [] }

let undoStack = []
let redoStack = []

let color = '#3be8b0'
let strokeWidth = 5
let backgroundColor = '#282a36'

let ctx

let isDrawing = false

const canvasWidth = 1000
const canvasHeight = 800

const resizeObserver = new ResizeObserver(() => {
    canvasBounds = canvasContainer.getBoundingClientRect()
})

resizeObserver.observe(canvasContainer)

function setup() {
    let canvas = createCanvas(canvasWidth, canvasHeight)
    canvas.parent('canvasContainer')

    background(backgroundColor)
    strokeJoin(ROUND);

    ctx = document.getElementById("defaultCanvas0")

    saveState(ctx.toDataURL())
}

function mouseDragged() {
    if (!isDrawing)
        return

    stroke(color)
    strokeWeight(strokeWidth)

    line(mouseX, mouseY, pmouseX, pmouseY)

    paintObject.path.push([mouseX, mouseY])

    // if slider is open close it
    sliderContainer.style.display = ""
}

function mouseReleased() {
    if (!isDrawing)
        return

    paintObject.color = color
    paintObject.strokeWidth = strokeWidth

    socket.emit("send-paint-path", paintObject)

    // clear the paint object
    paintObject.path = []

    saveState(ctx.toDataURL())
}

function saveState(state) {
    if (undoStack.length == 10)
        undoStack.shift()

    undoStack.push(state)
}


function paintPath(paintObject) {
    const path = paintObject.path

    stroke(paintObject.color)
    strokeWeight(paintObject.strokeWidth)

    for (let i = 0; i < path.length - 1; i++) {
        line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
    }

    // after painting save to undo stack
    saveState(ctx.toDataURL())
}

// socket evnets
socket.on("send-state", user => {
    socket.emit("send-canvas-state", user, ctx.toDataURL(), undoStack, redoStack)
})

socket.on("get-canvas-state", (data, undoData, redoData) => {
    loadImage(data, img => {
        image(img, 0, 0, canvasWidth, canvasHeight);
    });

    undoStack = [...undoData]
    redoStack = [...redoData]
})

socket.on("paint", paintObject => {
    paintPath(paintObject)
})

socket.on('clear-canvas', () => {
    saveState(ctx.toDataURL())
    background(backgroundColor)
})


// settings
const colorPicker = document.querySelector("#stroke-color")
const colorBtn = document.querySelector('#color-picker')
const colorCell = document.querySelector('#color1')
const brushSizeBtn = document.querySelector('#brush-size')
const eraser = document.querySelector('#eraser')
const strokeRange = document.querySelector("#stroke-Range")
const sliderContainer = document.querySelector(".slidecontainer")
const clearBtn = document.querySelector("#clear-canvas")
const undoBtn = document.querySelector("#undoBtn")
const redoBtn = document.querySelector("#redoBtn")

colorBtn.addEventListener("click", () => {
    colorPicker.click()
})

colorCell.addEventListener("click", () => {
    color = colorPicker.value

    drawingCursor.style.backgroundColor = color
})

colorPicker.addEventListener('change', e => {
    color = e.target.value
    colorCell.style.backgroundColor = color

    drawingCursor.style.backgroundColor = color
})

colorPicker.addEventListener('click', e => {
    color = e.target.value

    drawingCursor.style.backgroundColor = color
})


let strokeSizeSelecterOpen = false
brushSizeBtn.addEventListener("click", () => {
    if (!strokeSizeSelecterOpen)
        sliderContainer.style.display = "inline-block"
    else
        sliderContainer.style.display = ""

    strokeSizeSelecterOpen = !strokeSizeSelecterOpen
})

eraser.addEventListener('click', () => {
    color = backgroundColor
    drawingCursor.style.backgroundColor = 'white'
})

strokeRange.addEventListener("change", e => {
    strokeWidth = e.target.value

    drawingCursor.style.width = e.target.value + "px"
    drawingCursor.style.height = e.target.value + "px"

    cursorBounds = drawingCursor.getBoundingClientRect()
})

clearBtn.addEventListener("click", () => {
    saveState(ctx.toDataURL())
    background(backgroundColor)
    socket.emit("trigger-clear-canvas", ROOM_ID)
})


canvasContainer.addEventListener("mousemove", (e) => {
    if (e.target && !(e.target.matches('#defaultCanvas0') || e.target.matches('#drawing-cursor')))
        return

    // to stop wierd cursor artifacts while drawing
    e.preventDefault()

    drawingCursor.style.left = (e.clientX - canvasBounds.left - cursorBounds.width / 2) + "px"
    drawingCursor.style.top = (e.clientY - canvasBounds.top - cursorBounds.height / 2) + "px"
})

document.querySelector("body").addEventListener("mousemove", e => {
    if (e.target && (e.target.matches('#defaultCanvas0') || e.target.matches('#drawing-cursor'))) {
        drawingCursor.style.display = "inline-block"
        cursorBounds = drawingCursor.getBoundingClientRect()
        isDrawing = true
    }
    else {
        drawingCursor.style.display = "none"
        isDrawing = false
    }
})

undoBtn.addEventListener("click", () => {
    undo()
    socket.emit("undo-triggered")
})


redoBtn.addEventListener("click", () => {
    redo()
    socket.emit("redo-triggered")
})

socket.on("undo", () => {
    undo()
})

socket.on("redo", () => {
    redo()
})


function undo() {
    if (undoStack.length == 1)
        return

    updateRedoStack(undoStack.pop())

    loadImage(undoStack[undoStack.length - 1], img => {
        image(img, 0, 0, canvasWidth, canvasHeight);
    });
}

function redo() {
    if (redoStack.length == 0)
        return

    const data = redoStack.pop()

    loadImage(data, img => {
        image(img, 0, 0, canvasWidth, canvasHeight);
    });

    saveState(data)
}

function updateRedoStack(state) {
    if (redoStack.length == 10)
        redoStack.shift()

    redoStack.push(state)
}