// Node.js WebSocket服务，支持多题型与大题流转
const WebSocket = require('ws');
const http = require('http');
// 导入题库数据
const { quizBlocks } = require('./quizData.cjs');

const server = http.createServer();
const wssQuiz = new WebSocket.Server({ noServer: true });
const wssAdmin = new WebSocket.Server({ noServer: true });

let users = [];
let userAnswers = new Map(); // 存储用户答题数据 userId -> answers
let globalCurrentBlock = 0; // 全局当前开放的大题
let publishedAnswers = new Set(); // 存储已公布答案的大题索引
function userObj(ws,id) { return { ws, id, userId: generateUserId(), nickname: 'User'+id, name: '未设置姓名', called:false, lastBeat:Date.now() } }
let userIdSeq = 1;

function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

function saveUserAnswers(userId, blockIdx, questionIdx, answer) {
  if (!userAnswers.has(userId)) {
    userAnswers.set(userId, {});
  }
  const userData = userAnswers.get(userId);
  if (!userData[blockIdx]) {
    userData[blockIdx] = {};
  }
  userData[blockIdx][questionIdx] = answer;
  
  // 通知管理员更新用户列表（包含答案信息）
  broadcastAdminUserList();
}

function getUserAnswers(userId) {
  return userAnswers.get(userId) || {};
}

function getAllUsersWithAnswers() {
  return users.map(u => ({
    nickname: u.nickname,
    name: u.name || '未设置姓名',
    userId: u.userId,
    called: u.called,
    answers: getUserAnswers(u.userId),
    currentBlock: globalCurrentBlock
  }));
}

function broadcastAdminUserList() {
  const data = JSON.stringify({ 
    type:'user_list', 
    users: getAllUsersWithAnswers(),
    currentBlock: globalCurrentBlock,
    totalBlocks: quizBlocks.length
  });
  wssAdmin.clients.forEach(aw=>{ if(aw.readyState===1) aw.send(data); });
}

function broadcastBlockUpdate(blockIdx) {
  globalCurrentBlock = blockIdx;
  // 通知所有quiz用户
  const quizData = JSON.stringify({type:'open_block', idx: blockIdx});
  wssQuiz.clients.forEach(ws => { if(ws.readyState===1) ws.send(quizData); });
  
  // 发送之前大题的答案（如果有的话）
  if (blockIdx > 0) {
    const previousBlockIdx = blockIdx - 1;
    publishedAnswers.add(previousBlockIdx); // 记录已公布的答案
    const previousBlockAnswers = getPreviousBlockAnswers(previousBlockIdx);
    const answerData = JSON.stringify({type:'show_answers', blockIdx: previousBlockIdx, answers: previousBlockAnswers});
    wssQuiz.clients.forEach(ws => { if(ws.readyState===1) ws.send(answerData); });
  }
  
  // 通知管理员
  broadcastAdminUserList();
}

function generateAllQuestionsData() {
  const allQuestions = [];
  let questionNumber = 1;
  
  quizBlocks.forEach((block, blockIdx) => {
    const blockData = {
      title: block.title,
      items: []
    };
    
    block.questions.forEach((q, qIdx) => {
      if (q.type === 'blanks') {
        // 选词填空题：每个item作为一个独立题目
        q.items.forEach((item, itemIdx) => {
          blockData.items.push({
            questionNumber: questionNumber++,
            question: item[0].replace(/^\d+\.\s*/, ''),
            answer: item[1],
            isBlankItem: true,
            originalQuestionIdx: qIdx,
            itemIdx: itemIdx
          });
        });
      } else {
        // 其他题型
        let answerText = '';
        if (q.type === 'single' || q.type === 'multi') {
          if (Array.isArray(q.answer)) {
            answerText = q.answer.map(index => q.options[index]).join(', ');
          } else {
            answerText = q.options[q.answer];
          }
        } else {
          answerText = q.answer || '参考答案未提供';
        }
        
        blockData.items.push({
          questionNumber: questionNumber++,
          question: q.question,
          answer: answerText,
          isBlankItem: false,
          originalQuestionIdx: qIdx
        });
      }
    });
    
    allQuestions.push(blockData);
  });
  
  return allQuestions;
}

function getPreviousBlockAnswers(blockIdx) {
  const block = quizBlocks[blockIdx];
  if (!block) return null;
  
  const answers = [];
  
  block.questions.forEach((q, idx) => {
    if (q.type === 'blanks') {
      // 选词填空题的答案处理
      q.items.forEach((item, itemIdx) => {
        answers.push({
          question: item[0],
          answer: item[1]
        });
      });
    } else {
      // 其他题型的答案处理
      let answerText = '';
      if (q.type === 'single' || q.type === 'multi') {
        if (Array.isArray(q.answer)) {
          // 多选题
          answerText = q.answer.map(index => q.options[index]).join(', ');
        } else {
          // 单选题
          answerText = q.options[q.answer];
        }
      } else {
        answerText = q.answer || '参考答案未提供';
      }
      
      answers.push({
        question: q.question,
        answer: answerText
      });
    }
  });
  
  return {
    title: block.title,
    answers: answers
  };
}

wssQuiz.on('connection', (ws) => {
  let user = userObj(ws, userIdSeq++);
  
  ws.on('message', msg => {
    let m={}; try{m=JSON.parse(msg);}catch{ return; }
    
    if(m.type==='verify_user_id') {
      // 验证用户ID是否存在
      if (userAnswers.has(m.userId)) {
        // ID存在，发送验证成功
        ws.send(JSON.stringify({
          type: 'verify_success',
          userId: m.userId
        }));
      } else {
        // ID不存在，生成新ID
        const newUserId = generateUserId();
        ws.send(JSON.stringify({
          type: 'verify_failed',
          newUserId: newUserId,
          message: '用户ID不存在，已为您分配新的ID'
        }));
      }
    }
    
    if(m.type==='get_quiz') {
      // 新用户连接
      users.push(user);
      ws.send(JSON.stringify({type:'init_quiz', quizData: quizBlocks }));
      ws.send(JSON.stringify({type:'open_block', idx: globalCurrentBlock}));
      ws.send(JSON.stringify({type:'user_id', userId: user.userId}));
      broadcastAdminUserList();
    }
    
    if(m.type==='reconnect') {
      // 用户重连，根据userId恢复数据
      user.userId = m.userId;
      
      // 检查是否有保存的答题数据
      const savedAnswers = getUserAnswers(m.userId);
      
      // 查找现有用户或创建新用户记录
      let existingUser = users.find(u => u.userId === m.userId);
      if (existingUser) {
        // 更新现有用户的WebSocket连接
        existingUser.ws = ws;
        // 使用现有用户对象
        const userIndex = users.indexOf(user);
        users[userIndex] = existingUser;
        user = existingUser;
      } else {
        // 用户不在当前连接列表中，但可能有保存的数据
        users.push(user);
      }
      
      // 更新用户姓名（如果提供了的话）
      if (m.name) {
        user.name = m.name;
      }
      
      // 发送题目数据
      ws.send(JSON.stringify({type:'init_quiz', quizData: quizBlocks }));
      ws.send(JSON.stringify({type:'open_block', idx: globalCurrentBlock}));
      
      // 发送已保存的答题数据
      if (Object.keys(savedAnswers).length > 0) {
        ws.send(JSON.stringify({
          type:'restore_answers', 
          answers: savedAnswers,
          shownAnswers: Array.from(publishedAnswers)
        }));
      }
      
      // 发送所有已公布的答案
      publishedAnswers.forEach(blockIdx => {
        const blockAnswers = getPreviousBlockAnswers(blockIdx);
        if (blockAnswers) {
          ws.send(JSON.stringify({type:'show_answers', blockIdx: blockIdx, answers: blockAnswers}));
        }
      });
      
      broadcastAdminUserList();
    }
    
    if(m.type==='save_answer') {
      // 实时保存答题数据
      if (!user.userId) {
        return;
      }
      
      // 处理选词填空的特殊格式
      let questionKey = m.questionIdx;
      if (typeof m.questionIdx === 'string' && m.questionIdx.includes('_')) {
        // 选词填空格式：questionIdx_itemIdx
        questionKey = m.questionIdx;
      } else {
        // 普通格式
        questionKey = String(m.questionIdx);
      }
      
      saveUserAnswers(user.userId, m.blockIdx, questionKey, m.answer);
    }
    
    // 移除submit_block逻辑，因为答案实时保存
    
    if(m.type==='update_name') {
      // 更新用户姓名
      if (user.userId === m.userId) {
        user.name = m.name;
        broadcastAdminUserList();
      }
    }
    
    if(m.type==='heartbeat') {
      user.lastBeat = Date.now();
    }
  });
  
  ws.on('close',()=>{ 
    users = users.filter(u=>u.ws!==ws); 
    broadcastAdminUserList(); 
  });
  
  broadcastAdminUserList();
});

wssAdmin.on('connection', (ws) => {
  ws.on('message', msg => {
    let m={}; try{m=JSON.parse(msg);}catch{ return; }
    
    if(m.type==='get_user_list') {
      ws.send(JSON.stringify({ 
        type:'user_list', 
        users: getAllUsersWithAnswers(),
        currentBlock: globalCurrentBlock,
        totalBlocks: quizBlocks.length
      }));
    }
    
    if(m.type==='open_block') {
      // 开放指定大题
      const blockIdx = m.blockIdx;
      if (blockIdx >= 0 && blockIdx < quizBlocks.length) {
        globalCurrentBlock = Math.max(globalCurrentBlock, blockIdx);
        // 通知所有quiz用户
        const quizData = JSON.stringify({type:'open_block', idx: blockIdx});
        wssQuiz.clients.forEach(ws => { if(ws.readyState===1) ws.send(quizData); });
      }
    }
    
    if(m.type==='show_block_answers') {
      // 显示指定大题的答案
      const blockIdx = m.blockIdx;
      publishedAnswers.add(blockIdx);
      const blockAnswers = getPreviousBlockAnswers(blockIdx);
      if (blockAnswers) {
        const answerData = JSON.stringify({type:'show_answers', blockIdx: blockIdx, answers: blockAnswers});
        wssQuiz.clients.forEach(ws => { if(ws.readyState===1) ws.send(answerData); });
      }
    }
    
    if(m.type==='hide_block_answers') {
      // 隐藏指定大题的答案
      const blockIdx = m.blockIdx;
      publishedAnswers.delete(blockIdx);
      const hideData = JSON.stringify({type:'hide_answers', blockIdx: blockIdx});
      wssQuiz.clients.forEach(ws => { if(ws.readyState===1) ws.send(hideData); });
    }
    
    if(m.type==='call_user'){
      let u = users.find(x=>x.nickname===m.user);
      if(u&&u.ws.readyState===1) { 
        u.ws.send(JSON.stringify({type:'called'}));
        u.called = true;
        setTimeout(()=>{u.called=false; broadcastAdminUserList();},2000);
      }
    }
    
    if(m.type==='get_all_questions') {
      // 发送所有题目和答案数据
      const allQuestionsData = generateAllQuestionsData();
      ws.send(JSON.stringify({
        type: 'all_questions',
        questions: allQuestionsData
      }));
    }
    
    if(m.type==='get_user_answers') {
      // 获取特定用户的答案
      const userAnswersData = getUserAnswers(m.userId);
      ws.send(JSON.stringify({
        type: 'user_answers',
        userId: m.userId,
        answers: userAnswersData
      }));
    }
  });
  
  // 发送初始数据
  broadcastAdminUserList();
});

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws/quiz') {
    wssQuiz.handleUpgrade(req, socket, head, ws => wssQuiz.emit('connection', ws, req))
  } else if (req.url === '/ws/admin') {
    wssAdmin.handleUpgrade(req, socket, head, ws => wssAdmin.emit('connection', ws, req))
  } else {
    socket.destroy();
  }
});

server.listen(9527, () => {
  console.log('WebSocket服务启动，端口: 9527');
});
