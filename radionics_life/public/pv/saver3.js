
class SimplexNoise {
    constructor() {
        // To remove the need for index wrapping, double the permutation table length
        this.perm = new Array(512);
        this.grad3 = [
            [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
            [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
        ];

        this.seed(0);
    }

    seed(seed) {
        if (seed > 0 && seed < 1) {
            // Scale the seed for consistency
            seed *= 65536;
        }

        seed = Math.floor(seed);

        if (seed < 256) {
            seed |= seed << 8;
        }

        for (let i = 0; i < 256; i++) {
            let v;
            if (i & 1) {
                v = this.perm[i] ^ (seed & 255);
            } else {
                v = this.perm[i] ^ ((seed >> 8) & 255);
            }

            this.perm[i + 256] = this.perm[i] = v;
        }
    }



    noise(xin, yin) {
        // Noise contributions from the three corners
        let n0, n1, n2;

        // Skewing/Unskewing factors for 2D
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        // Noise contributions from the first corner
        let s = (xin + yin) * F2;
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t; // Unskew the cell origin back to (x, y) space
        const Y0 = j - t;
        const x0 = xin - X0; // The x, y distances from the cell origin
        const y0 = yin - Y0;

        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        let i1, j1; // Offsets for second (middle) corner of simplex in (i, j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        // A step of (1, 0) in (i, j) means a step of (1 - c, -c) in (x, y), and
        // a step of (0, 1) in (i, j) means a step of (-c, 1 - c) in (x, y), where
        // c = (3 - sqrt(3))/6

        const x1 = x0 - i1 + G2; // Offsets for middle corner in (x, y) unskewed coords
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x, y) unskewed coords
        const y2 = y0 - 1.0 + 2.0 * G2;

        // Work out the hashed gradient indices of the three simplex corners
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0.0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0.0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0.0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }

        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }
}


const 
    pi = Math.PI,
    sqrt = Math.sqrt,
    pow = Math.pow;

let seed = Math.random()*1000,
    mosPos = {
        x: 1000,
        y: 1000,
    };
//VARS FOR CANVAS AND TIMING EVENTS
let canvas = document.createElement('canvas'),
    context = canvas.getContext('2d'),
    width = canvas.width = window.innerWidth,
    height = canvas.height = window.innerHeight,
    time = 0,
    timeMax = Infinity,
    timeForward = true,
    speed = .3,
    disMult = .0001,
    targetDisMult = .003,
    sizeMult = 20,
    targetSzMult = 15,
    clearScreen = false,
    pauseAnimation = false,
    showLines = true,
    showDots = true,
    inColor = false,
    automated = true,
    lightOff = 0;

context.strokeStyle = 'white';
context.fillStyle = 'white';

context.lineWidth = .5;


const simNoise = new SimplexNoise();

canvas.style = `display: block;
                position: static;
                top: 0px;
                left: 0px;
                cursor: none;
                margin:auto;
                background-color: black`;

document.body.style = `margin: 0`;

document.body.appendChild(canvas)

//USER INPUT EVENT LISTENER
document.addEventListener('keydown', userInputEvent, false);
canvas.onmousemove = findObjectCoords;


canvas.addEventListener('click', ()=>{
    targetSzMult = ranRange(10, 20)
    targetDisMult = ranRange(.0003, .05)
}, false);


function logInfo () {
    console.log(`
    
    time = ${time}0,
    timeForward = ${timeForward}true,
    speed ${speed} = .4,
    disMult ${disMult}= 1,
    targetDisMult = ${targetDisMult}20,
    sizeMult = ${sizeMult}20,
    targetSzMult = ${targetSzMult}20,
    clearScreen = true,
    pauseAnimation = false,
    showLines = true,
    showDots = true,
    inColor = false,
    lightOff = ${lightOff}0;
    
    
    `);
}



// 0.0003482808479138186
// 69
// 2
// 24

//USER INPUT LOGIC
function userInputEvent(input) {
    switch (input.code) {
        case 'Space':
            pauseAnimation = !pauseAnimation;
            if (!pauseAnimation) {
                render()
            }
            logInfo()
        break;
        case 'ArrowUp':
            speed = speed < 40 ? speed+.1 : 40;
        break;
        case "ArrowDown":
            speed = speed > .1 ? speed-.1 : .1;
        break;
        case 'ArrowLeft':
            sizeMult = sizeMult < 300 ? sizeMult+.1 : 300;
        break;
        case "ArrowRight":
            sizeMult = sizeMult > .1 ? sizeMult-.1 : .1;
        break;
        case 'KeyQ':
            disMult*=2;
            // console.log(disMult);
        break;
        case 'KeyW':
            disMult/=2;
            // console.log(disMult);
        case 'KeyA':
            disMult*=1.1;
            // console.log(disMult);
        break;
        case 'KeyS':
            disMult/=1.1;
            // console.log(disMult);
        break;
        case "KeyL":
            showLines = !showLines;
            if (!showDots && !showLines) showDots = true
        break;
        case "KeyO":
            showDots = !showDots;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
            if (!showDots && !showLines) showLines = true
        break;
        case "KeyZ":
            clearScreen = !clearScreen;
        break;
        case "KeyC":
            inColor = !inColor;
        break;
        case "KeyU":
            lightOff -= 1;
            // console.log(light);
        break;
        case "KeyI":
            lightOff += 1;
        break;
        }
}

//SET THE CANVAS ORIGIN TO THE MIDDLE OF THE WINDOW
    //   context.translate(width/2, height/2)   

//ANIMAITON CYCLE

        render3()

        function render3() {

        if (timeForward && time < timeMax) {
            time+=speed/50
        } else if (timeForward && time >= timeMax) {
            setTimeout(()=>{timeForward = false;}, 100)
        } else if (!timeForward && time > 1) {
            time-=speed/50
        } else if ( time <= 1){
            timeForward = true;
            time = 1.1
            seed = Math.random()  
        }

        if (automated) {
            // console.log(lightOff);
            lightOff = ((Math.sin(time/20))*20) - 20


        // const noiseInc = simNoise.noise(time/1000, time/700);
        // disMult = disMult * 1.0002 < targetDisMult ? disMult * 1.0002 : disMult * .9997; 
        // sizeMult =  sizeMult * 1.0002 < targetSzMult ? sizeMult * 1.0002 : sizeMult * .9997;

        disMult = Math.sin(time/10)/100
        // sizeMult =  sizeMult * 1.0002 < targetSzMult ? sizeMult * 1.0002 : sizeMult * .9997;

        }


        // if(clearScreen) clearFullScreen()

        // renderMouse()
            
        createImg(time)
        
    }

function createImg(s) { 

    const limits = {
        sX: 0,
        eX: width/sizeMult,
        sY: 0,
        eY: height/sizeMult,
    },
    
    points = [];

        for (let x = limits.sX; x < limits.eX; x++) {

            points.push([]);
            
            for (let y = limits.sY; y < limits.eY; y++) {

                const
                distance = sqrt( pow((x*sizeMult)-(width/2), 2) + pow((y*sizeMult)-(height/2), 2) ),
                noiseX = (x/sizeMult + seed ) + s/100 + (distance/(113377*disMult)), 
                noiseY = (y/sizeMult + seed ) + s/100 + (distance/113377*disMult),
                N1 = simNoise.noise(noiseX, noiseY),
                N2 = simNoise.noise(noiseY, noiseY),
                // N1 = Noise(noiseX, noiseY),
                // N2 = Noise(noiseY, noiseY),
                radius = 2+N1+N2 > 1 ? 2+N1+N2 : 1,
                X = x*sizeMult + (N1*sizeMult-N2*sizeMult),
                Y = y*sizeMult + (N1*sizeMult+N2*sizeMult)*distance*disMult,

                point = {x: X, y: Y, r: radius, dis: distance };

                points[x-limits.sX].push(point)
                        
            }
            
        }

        renderPoints(points)

}

function renderMouse() {
    context.fillStyle = 'white';                  
    context.beginPath()
    context.arc(mosPos.x, mosPos.y, 2, 0, pi*2)
    context.fill()
}

function renderPoints(arr) {

    // const t = Math.ceil(time/sizeMult)

    for (let i = 0; i < arr.length; i++) {

        for (let j = 0; j < arr[i].length; j++) {
            
            const p = arr[i][j];

            const colorVar = (p.dis/3)*p.r+144

            // const pColor = `hsl(${colorVar}, 100%, 77%)`;
            const pColor = `hsl(${colorVar}, ${inColor ? 100 : 0}%, ${(colorVar/4%80)+lightOff}%)`;


            if (showLines) {
                const px = 
                    arr[i+1] != undefined 
                    ? arr[i+1][j]   
                    : false;
                const py = 
                    arr[i][j+1] != undefined 
                    ? arr[i][j+1]   
                    : false;
                const pxy = 
                    arr[i+1] != undefined 
                    && arr[i+1][j+1] != undefined 
                    ? arr[i+1][j+1] 
                    : false;

                context.strokeStyle = pColor;                  
                
                if (px||py||pxy) {
                    context.beginPath()
                    context.moveTo(p.x,p.y)
                    if (px) context.lineTo(px.x, px.y)
                    if (py) context.lineTo(py.x, py.y)
                    context.lineTo(p.x,p.y)
                    if (pxy) context.lineTo(pxy.x, pxy.y)
                    context.stroke()
                }
            }

            if (showDots) {
                context.fillStyle = pColor;                  
                context.beginPath()
                context.arc(p.x, p.y, p.r, 0, pi*2)
                context.fill()
                
            }

        }
    }

}

function clearFullScreen() {

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    
}

function mapNumber (number, min1, max1, min2, max2) {
    return ((number - min1) * (max2 - min2) / (max1 - min1) + min2);
};

function ranRange(min, max) {
    // Ensure min is less than max
    if (min > max) {
        [min, max] = [max, min];
    }

    // Generate a random number within the range
    const randomNumber = Math.random() * (max - min) + min;

    return randomNumber;
}


function findObjectCoords(mouseEvent) {

    let obj = canvas,
        obj_left = 0,
        obj_top = 0,
        xpos,
        ypos;

while (obj.offsetParent)
{
    obj_left += obj.offsetLeft;
    obj_top += obj.offsetTop;
    obj = obj.offsetParent;
}
if (mouseEvent)
{
    xpos = mouseEvent.pageX;
    ypos = mouseEvent.pageY;
}

xpos -= obj_left;
ypos -= obj_top;

mosPos.x = xpos
mosPos.y = ypos

}
