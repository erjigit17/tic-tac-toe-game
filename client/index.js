import { io } from 'socket.io-client';
import readline from 'readline';
import * as dotenv from 'dotenv'
dotenv.config()
const url = `http://${process.env.HOST}:${process.env.WS_PORT}`;
console.log(url)
let me // 'X' or 'O'
let board
let roundId
let myTurn = false
let timer
let availableNumbers = []
let score

const commands = new Map()
commands.set('r', () => {
  getStatus()
})
commands.set('q', () => {
  process.exit(0)
})
commands.set('s', () => {
  socket.emit('surrender', { roundId })
})
commands.set('m', () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const message = new Promise((resolve) => {
    rl.question(`input your message\n`, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  message.then((answer) => {
    socket.emit('message', answer)
  })
})

const socket = io(url, {
  transports: ['websocket'],
  reconnectionDelayMax: 1000,
});

socket.on('connect', () => {
  console.log('connected')
  console.log('client id', socket.id)

});

socket.on('status', (data) => {
  score = data.score
  if (data.currentRound) {
    me = data.currentRound.firstGamerId === socket.id ? 'X' : 'O'
    board = JSON.parse(data.currentRound.board)
    roundId = data.currentRound.id
    myTurn = data.currentRound.gamer === me
    availableNumbers = myTurn? emptyCells(board) : []
    timer = calcRemainingTime(data.currentRound?.expiration)
  }
  console.clear()
  printBoard(board)
  console.log(`
  score: ${convertScore(score)}
  me: ${me}    myTurn: ${myTurn}   timer: ${timer}
  to refresh 'r', exit 'q', surrender 's', send message 'm' and press enter
  `)
  if (myTurn) {
    console.log('available numbers', availableNumbers.join(', '))
  }
})

socket.on('message', (data) => {
  console.log(data)
});

socket.on('connect_error', (err) => {
  console.log(err.message)
});

socket.on('init', async () => {
  input(myTurn)
});

// input stdin
function input(myTurn) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });


  const command = new Promise((resolve) => {
    rl.question(`input your command\n`, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  command.then((answer) => {
    if (commands.has(answer)) {
      commands.get(answer)()
    } else if (availableNumbers.includes(+answer)) {
      socket.emit('move', { roundId, to: +answer })
    } else {
      console.error('wrong command')
    }
    input(myTurn)
  })
}



async function getStatus() {
  return new Promise((resolve) => {
    socket.emit('get_status', (data) => {
      resolve(data)
    })
  })
}

function printBoard(board){
  if (!board) { return }
  const $ = (x) => x === '' ? ' ' : x;
  for (let i = 0; i < 3; i++) {
    console.log(`| ${$(board[i][0])} | ${$(board[i][1])} | ${$(board[i][2])} |`);
  }
}

function emptyCells(board) {
  let empty = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === '') {
        empty.push(i * 3 + j + 1);
      }
    }
  }
  return empty;
}

// calc remaining time for current round expiration date and now,  in seconds
function calcRemainingTime(expiration) {
  if (!expiration) { return 0 }
  const now = new Date()
  const exp = new Date(expiration)
  const diff = exp - now
  return Math.floor(diff / 1000)
}

// connver array of scor with winner id to arrey of 'W' and 'L'
function convertScore(score) {
  const result = []
  for (let i = 0; i < score.length; i++) {
    if (score[i] === socket.id) {
      result.push('W')
    } else {
      result.push('L')
    }
  }
  return result
}
