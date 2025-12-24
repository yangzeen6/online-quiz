<template>
  <div class="quiz-page">
    <el-card class="quiz-card">
      <!-- 用户姓名显示区域 -->
      <div class="user-info">
        <div v-if="!editingName" class="name-display">
          <span>{{ userName }}</span>
          <el-button link size="small" @click="startEditName" style="margin-left: 8px;">
            <el-icon><Edit /></el-icon>
          </el-button>
          <!-- <el-button link size="small" @click="logout" style="margin-left: 8px; color: #666;">
            退出
          </el-button> -->
        </div>
        <div v-else class="name-edit">
          <el-input 
            v-model="tempUserName" 
            size="small" 
            style="width: 120px;"
            @keyup.enter="saveUserName"
            @blur="saveUserName"
            ref="nameInput"
          />
          <el-button link size="small" @click="saveUserName" style="margin-left: 4px;">
            <el-icon><Check /></el-icon>
          </el-button>
          <el-button link size="small" @click="cancelEditName" style="margin-left: 4px;">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
      
      <div class="quiz-title">在线答题</div>
      <div v-if="wsStatus !== 'connected'" class="ws-status">正在连接服务器...</div>
      <div v-else>
        <!-- 单页显示所有已开放的大题 -->
        <div v-for="(block, idx) in blocks.slice(0, currentBlock + 1)" :key="block.title||idx" style="margin-bottom:40px; padding:20px; border:1px solid #e4e7ed; border-radius:8px; background:#fafafa;">
          <div class="block-title">第{{idx+1}}大题：{{block.title}}</div>
          
          <!-- 遍历每个问题 -->
          <div v-for="(q, qidx) in block.questions" :key="qidx" style="margin-bottom:30px;">
            
            <!-- 选词填空题的特殊处理 -->
            <div v-if="q.type === 'blanks'">
              <!-- 可选词汇放在大题开头 -->
              <div style="margin-bottom:20px; padding:15px; background:#e8f4fd; border-radius:8px; border-left:4px solid #409eff;">
                <strong style="color:#409eff; font-size:1.1em;">📝 可选词汇：</strong>
                <div style="margin-top:8px;">
                  <span v-for="(word, wordIdx) in q.options" :key="word" 
                        style="display:inline-block; margin:5px 10px 5px 0; padding:4px 12px; background:#fff; border:1px solid #409eff; border-radius:20px; color:#409eff; font-weight:500;">
                    {{ word }}
                  </span>
                </div>
              </div>
              
              <!-- 每个填空小题独立显示 -->
              <div v-for="(item, itemIdx) in q.items" :key="itemIdx" class="quiz-q-item" style="margin-bottom:25px; padding:15px; background:#fff; border-radius:8px; border:1px solid #e4e7ed;">
                <div class="quiz-q-text" style="margin-bottom:12px; font-weight:500;">
                  {{itemIdx + 1}}. {{item[0].replace(/^\d+\.\s*/, '')}}
                </div>
                <el-input 
                  :model-value="(answers[idx] && answers[idx][qidx] && Array.isArray(answers[idx][qidx]) && answers[idx][qidx][itemIdx] !== undefined) ? answers[idx][qidx][itemIdx] : ''" 
                  @update:model-value="(value) => updateBlankAnswer(idx, qidx, itemIdx, value)"
                  :disabled="idx > currentBlock"
                  :class="getBlankInputClass(idx, qidx, itemIdx)"
                  placeholder="请输入答案"
                  style="max-width:300px;"
                />
              </div>
            </div>
            
            <!-- 其他题型的正常处理 -->
            <div v-else class="quiz-q-item" style="margin-bottom:20px; padding:15px; background:#fff; border-radius:8px; border:1px solid #e4e7ed;">
              <div class="quiz-q-text" style="margin-bottom:12px; font-weight:500;">
                {{getQuestionNumber(idx, qidx)}}. {{q.question}}
              </div>
              <!-- 单选题 -->
              <el-radio-group v-if="q.type==='single'" 
                :model-value="answers[idx] && answers[idx][qidx] ? answers[idx][qidx] : ''" 
                @update:model-value="(value) => updateAnswer(idx, qidx, value)"
                :disabled="idx > currentBlock">
                <el-radio v-for="(opt, optIdx) in q.options" :key="optIdx" :value="opt" 
                  :class="getOptionClass(idx, qidx, optIdx, opt)"
                  style="display:block; margin-bottom:8px;">{{opt}}</el-radio>
              </el-radio-group>
              <!-- 多选题 -->
              <el-checkbox-group v-else-if="q.type==='multi'" 
                :model-value="answers[idx] && answers[idx][qidx] ? answers[idx][qidx] : []" 
                @update:model-value="(value) => updateAnswer(idx, qidx, value)"
                :disabled="idx > currentBlock">
                <el-checkbox v-for="(opt, optIdx) in q.options" :key="optIdx" :value="opt" 
                  :class="getOptionClass(idx, qidx, optIdx, opt)"
                  style="display:block; margin-bottom:8px;">{{opt}}</el-checkbox>
              </el-checkbox-group>
              <!-- 开放填空题 -->
              <el-input v-else-if="q.type==='text'"
                :model-value="answers[idx] && answers[idx][qidx] ? answers[idx][qidx] : ''" 
                @update:model-value="(value) => updateAnswer(idx, qidx, value)"
                :disabled="idx > currentBlock"
                :class="getTextInputClass(idx, qidx)"
                type="textarea"
                :rows="3"
                placeholder="请输入答案" />
            </div>
          </div>
        </div>
        
        <!-- 等待下一大题的提示 -->
        <div v-if="currentBlock < blocks.length - 1" style="text-align:center; padding:30px; color:#909399; border:2px dashed #e4e7ed; border-radius:8px;">
          <div style="font-size:18px; margin-bottom:10px;">⏳</div>
          <div>等待老师开放第{{currentBlock + 2}}大题...</div>
        </div>
        
        <!-- 答案显示区域 -->
        <div v-if="previousAnswers.filter(answer => answer !== null).length > 0" style="margin-top:50px; padding:20px; border:2px solid #67c23a; border-radius:8px; background:#f0f9ff;">
          <div style="text-align:center; font-size:1.5em; font-weight:bold; color:#67c23a; margin-bottom:20px;">
            📋 参考答案
          </div>
          
          <div v-for="(answerBlock, idx) in previousAnswers" :key="idx" v-show="answerBlock !== null" style="margin-bottom:30px;">
            <div v-if="answerBlock" style="font-size:1.2em; font-weight:600; color:#409eff; margin-bottom:15px; border-bottom:2px solid #409eff; padding-bottom:5px;">
              第{{idx+1}}大题：{{answerBlock.title}}
            </div>
            
            <div v-if="answerBlock" v-for="(item, qidx) in answerBlock.answers" :key="qidx" style="margin-bottom:15px; padding:10px; background:#fff; border-radius:6px; border-left:4px solid #67c23a;">
              <div style="font-weight:500; margin-bottom:5px; color:#333;">
                {{getAnswerQuestionNumber(idx, qidx)}}. {{item.question.replace(/^\d+\.\s*/, '')}}
              </div>
              <div style="color:#67c23a; font-weight:600;">答案：{{item.answer}}</div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Edit, Check, Close } from '@element-plus/icons-vue';
import BlanksFill from '../components/BlanksFill.vue';

const wsStatus = ref('connecting');
const blocks = ref([]);
const answers = reactive([]);
const currentBlock = ref(0);
const socket = ref(null);
const router = useRouter();
const userId = ref('');
const previousAnswers = ref([]); // 存储之前大题的答案
const userName = ref('');
const editingName = ref(false);
const tempUserName = ref('');
const nameInput = ref(null);
const shownAnswerBlocks = ref(new Set()); // 跟踪哪些大题的答案已显示

// 本地存储相关函数
function saveUserIdToLocal(id) {
  console.log('保存用户ID到本地:', id);
  localStorage.setItem('quiz_user_id', id);
  userId.value = id;
}

function getUserIdFromLocal() {
  const id = localStorage.getItem('quiz_user_id');
  console.log('从本地获取用户ID:', id);
  return id;
}

function getUserNameFromLocal() {
  const name = localStorage.getItem('quiz_user_name');
  console.log('从本地获取用户姓名:', name);
  return name || '未设置姓名';
}

function saveUserNameToLocal(name) {
  console.log('保存用户姓名到本地:', name);
  localStorage.setItem('quiz_user_name', name);
  userName.value = name;
}

function startEditName() {
  editingName.value = true;
  tempUserName.value = userName.value;
  nextTick(() => {
    nameInput.value?.focus();
  });
}

function saveUserName() {
  if (tempUserName.value.trim()) {
    const newName = tempUserName.value.trim();
    saveUserNameToLocal(newName);
    
    // 通知服务器更新姓名
    if (socket.value?.readyState === 1 && userId.value) {
      socket.value.send(JSON.stringify({
        type: 'update_name',
        userId: userId.value,
        name: newName
      }));
    }
    
    editingName.value = false;
    ElMessage.success('姓名已更新');
  }
}

function cancelEditName() {
  editingName.value = false;
  tempUserName.value = '';
}

// 退出登录
function logout() {
  // 清除本地存储的用户信息
  localStorage.removeItem('quiz_user_name');
  localStorage.removeItem('quiz_user_id');
  // 关闭WebSocket连接
  if (socket.value) {
    socket.value.close();
  }
  // 跳转到登录页面
  router.push('/');
}

// 实时保存答题数据到服务器
function saveAnswerToServer(blockIdx, questionIdx, answer) {
  if (socket.value?.readyState === 1 && userId.value) {
    socket.value.send(JSON.stringify({
      type: 'save_answer',
      blockIdx,
      questionIdx,
      answer
    }));
  }
}

// 直接的答案更新函数
function updateAnswer(blockIdx, questionIdx, value) {
  if (answers[blockIdx] && answers[blockIdx][questionIdx] !== undefined) {
    answers[blockIdx][questionIdx] = value;
    // 立即保存到服务器
    saveAnswerToServer(blockIdx, questionIdx, value);
  }
}

// 选词填空题的专用更新函数
function updateBlankAnswer(blockIdx, questionIdx, itemIdx, value) {
  // 确保答案数组存在并更新
  if (answers[blockIdx] && answers[blockIdx][questionIdx] && Array.isArray(answers[blockIdx][questionIdx]) && itemIdx >= 0 && itemIdx < answers[blockIdx][questionIdx].length) {
    answers[blockIdx][questionIdx][itemIdx] = value;
    // 立即保存到服务器，使用特殊格式标识选词填空
    saveAnswerToServer(blockIdx, `${questionIdx}_${itemIdx}`, value);
  }
}

// 计算题目编号的函数
function getQuestionNumber(blockIdx, questionIdx) {
  let questionNumber = 1;
  
  // 计算前面所有大题的题目数量
  for (let i = 0; i < blockIdx; i++) {
    const block = blocks.value[i];
    if (block) {
      for (let j = 0; j < block.questions.length; j++) {
        const q = block.questions[j];
        if (q.type === 'blanks') {
          // 选词填空题按items数量计算
          questionNumber += q.items ? q.items.length : 0;
        } else {
          // 其他题型按1题计算
          questionNumber += 1;
        }
      }
    }
  }
  
  // 计算当前大题中当前题目之前的题目数量
  const currentBlock = blocks.value[blockIdx];
  if (currentBlock) {
    for (let j = 0; j < questionIdx; j++) {
      const q = currentBlock.questions[j];
      if (q.type === 'blanks') {
        questionNumber += q.items ? q.items.length : 0;
      } else {
        questionNumber += 1;
      }
    }
  }
  
  return questionNumber;
}

// 计算答案区域题目编号的函数
function getAnswerQuestionNumber(blockIdx, answerIdx) {
  let questionNumber = 1;
  
  // 计算前面所有大题的题目数量
  for (let i = 0; i < blockIdx; i++) {
    if (previousAnswers.value[i] && previousAnswers.value[i].answers) {
      questionNumber += previousAnswers.value[i].answers.length;
    }
  }
  
  // 加上当前答案的索引
  questionNumber += answerIdx;
  
  return questionNumber;
}

function isBlockLocked(idx) {
  // 仅允许答当前大题
  return idx > currentBlock.value;
}

// 检查选项是否正确
function isOptionCorrect(blockIdx, questionIdx, optionIdx, optionValue) {
  const block = blocks.value[blockIdx];
  if (!block || !block.questions[questionIdx]) return false;
  
  const question = block.questions[questionIdx];
  const answer = question.answer;
  
  if (question.type === 'single') {
    // 单选题：检查选项索引是否匹配
    return answer === optionIdx;
  } else if (question.type === 'multi') {
    // 多选题：检查选项索引是否在答案数组中
    return Array.isArray(answer) && answer.includes(optionIdx);
  }
  
  return false;
}

// 检查用户是否选择了某个选项
function isOptionSelected(blockIdx, questionIdx, optionIdx, optionValue) {
  if (!answers[blockIdx] || !answers[blockIdx][questionIdx]) return false;
  
  const userAnswer = answers[blockIdx][questionIdx];
  const question = blocks.value[blockIdx]?.questions[questionIdx];
  
  if (question?.type === 'single') {
    // 单选题：检查用户答案是否等于选项值
    return userAnswer === optionValue;
  } else if (question?.type === 'multi') {
    // 多选题：检查选项值是否在用户答案数组中
    return Array.isArray(userAnswer) && userAnswer.includes(optionValue);
  }
  
  return false;
}

// 获取选项的CSS类名
function getOptionClass(blockIdx, questionIdx, optionIdx, optionValue) {
  // 只有当该大题的答案已显示时才应用颜色
  if (!shownAnswerBlocks.value.has(blockIdx)) {
    return '';
  }
  
  const isCorrect = isOptionCorrect(blockIdx, questionIdx, optionIdx, optionValue);
  const isSelected = isOptionSelected(blockIdx, questionIdx, optionIdx, optionValue);
  
  if (isCorrect) {
    return 'option-correct';
  } else if (isSelected) {
    return 'option-incorrect';
  }
  
  return '';
}

// 检查选词填空答案是否正确
function isBlankAnswerCorrect(blockIdx, questionIdx, itemIdx) {
  const block = blocks.value[blockIdx];
  if (!block || !block.questions[questionIdx]) return false;
  
  const question = block.questions[questionIdx];
  if (question.type !== 'blanks' || !question.items || !question.items[itemIdx]) return false;
  
  const correctAnswer = question.items[itemIdx][1]; // 正确答案
  const userAnswer = answers[blockIdx] && answers[blockIdx][questionIdx] && answers[blockIdx][questionIdx][itemIdx] 
    ? answers[blockIdx][questionIdx][itemIdx].trim().toLowerCase() 
    : '';
  
  return userAnswer === correctAnswer.toLowerCase();
}

// 获取选词填空输入框的CSS类名
function getBlankInputClass(blockIdx, questionIdx, itemIdx) {
  // 只有当该大题的答案已显示时才应用颜色
  if (!shownAnswerBlocks.value.has(blockIdx)) {
    return '';
  }
  
  // 检查用户是否有输入答案
  const userAnswer = answers[blockIdx] && answers[blockIdx][questionIdx] && answers[blockIdx][questionIdx][itemIdx] 
    ? answers[blockIdx][questionIdx][itemIdx].trim() 
    : '';
  
  if (!userAnswer) {
    return ''; // 没有输入答案，不显示颜色
  }
  
  const isCorrect = isBlankAnswerCorrect(blockIdx, questionIdx, itemIdx);
  
  return isCorrect ? 'blank-input-correct' : 'blank-input-incorrect';
}

// 检查开放填空题答案是否正确
function isTextAnswerCorrect(blockIdx, questionIdx) {
  const block = blocks.value[blockIdx];
  if (!block || !block.questions[questionIdx]) return false;
  
  const question = block.questions[questionIdx];
  if (question.type !== 'text') return false;
  
  const correctAnswer = question.answer ? question.answer.toLowerCase().trim() : '';
  const userAnswer = answers[blockIdx] && answers[blockIdx][questionIdx] 
    ? answers[blockIdx][questionIdx].toLowerCase().trim() 
    : '';
  
  // 对于开放题，可以进行更宽松的匹配
  return userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer);
}

// 获取开放填空题输入框的CSS类名
function getTextInputClass(blockIdx, questionIdx) {
  // 只有当该大题的答案已显示时才应用颜色
  if (!shownAnswerBlocks.value.has(blockIdx)) {
    return '';
  }
  
  // 检查用户是否有输入答案
  const userAnswer = answers[blockIdx] && answers[blockIdx][questionIdx] 
    ? answers[blockIdx][questionIdx].trim() 
    : '';
  
  if (!userAnswer) {
    return ''; // 没有输入答案，不显示颜色
  }
  
  const isCorrect = isTextAnswerCorrect(blockIdx, questionIdx);
  
  return isCorrect ? 'blank-input-correct' : 'blank-input-incorrect';
}
function handleWSMsg(ev) {
  let msg = {};
  try { msg = JSON.parse(ev.data); } catch { return; }
  
  if(msg.type==='verify_success') {
    // ID验证成功，继续重连流程
    console.log('用户ID验证成功:', msg.userId);
    const currentName = getUserNameFromLocal();
    socket.value.send(JSON.stringify({ 
      type:'reconnect', 
      userId: msg.userId,
      name: currentName 
    }));
  }
  
  if(msg.type==='verify_failed') {
    // ID验证失败，使用新ID
    console.log('用户ID验证失败，使用新ID:', msg.newUserId);
    saveUserIdToLocal(msg.newUserId);
    
    ElMessage({
      message: msg.message || '检测到新设备，已为您分配新的用户ID',
      type: 'warning',
      duration: 4000,
      showClose: true
    });
    
    // 使用新ID请求初始题目
    socket.value.send(JSON.stringify({ type:'get_quiz' }));
  }
  
  if(msg.type==='open_block') {
    const oldBlock = currentBlock.value;
    currentBlock.value = msg.idx;
    console.log('收到开放大题通知:', msg.idx);
    
    // 如果是开放新的大题，显示弹窗提醒
    if (msg.idx > oldBlock) {
      ElMessage({
        message: `🎉 第 ${msg.idx + 1} 大题已开放，可以开始答题了！`,
        type: 'success',
        duration: 4000,
        showClose: true
      });
    }
  }
  if(msg.type==='show_answers') {
    // 显示之前大题的答案
    console.log('收到答案显示通知:', msg);
    if (msg.answers) {
      // 确保答案按顺序插入
      while (previousAnswers.value.length <= msg.blockIdx) {
        previousAnswers.value.push(null);
      }
      previousAnswers.value[msg.blockIdx] = msg.answers;
      
      // 标记该大题的答案已显示
      shownAnswerBlocks.value.add(msg.blockIdx);
      
      // 显示弹窗提醒
      ElMessage({
        message: `📋 第 ${msg.blockIdx + 1} 大题答案已公布，请查看页面底部！`,
        type: 'info',
        duration: 4000,
        showClose: true
      });
    }
  }
  if(msg.type==='user_id') {
    // 保存用户ID到本地存储
    console.log('收到用户ID:', msg.userId);
    saveUserIdToLocal(msg.userId);
    
    // 发送用户姓名到服务器
    const currentName = getUserNameFromLocal();
    if (currentName && currentName !== '未设置姓名') {
      socket.value.send(JSON.stringify({
        type: 'update_name',
        userId: msg.userId,
        name: currentName
      }));
    }
  }
  if(msg.type==='restore_answers') {
    // 恢复已保存的答题数据
    console.log('收到恢复数据:', msg.answers);
    const savedAnswers = msg.answers;
    
    // 等待answers数组初始化完成后再恢复数据
    setTimeout(() => {
      for (let blockIdx in savedAnswers) {
        const blockIndex = parseInt(blockIdx);
        if (answers[blockIndex]) {
          for (let questionKey in savedAnswers[blockIdx]) {
            const answer = savedAnswers[blockIdx][questionKey];
            
            // 检查是否是选词填空的特殊格式 (questionIdx_itemIdx)
            if (questionKey.includes('_')) {
              const [questionIdx, itemIdx] = questionKey.split('_').map(Number);
              if (answers[blockIndex][questionIdx] && Array.isArray(answers[blockIndex][questionIdx])) {
                answers[blockIndex][questionIdx][itemIdx] = answer;
                console.log(`恢复选词填空答案 [${blockIndex}][${questionIdx}][${itemIdx}]:`, answer);
              }
            } else {
              // 普通题目
              const questionIndex = parseInt(questionKey);
              if (answers[blockIndex][questionIndex] !== undefined) {
                answers[blockIndex][questionIndex] = answer;
                console.log(`恢复答案 [${blockIndex}][${questionIndex}]:`, answer);
              }
            }
          }
        }
      }
    }, 200);
    
    // 如果有已显示的答案信息，也需要恢复
    if (msg.shownAnswers) {
      msg.shownAnswers.forEach(blockIdx => {
        shownAnswerBlocks.value.add(blockIdx);
      });
    }
  }
  if(msg.type==='init_quiz') {
    // 重新设计题库数据解析
    blocks.value = msg.quizData;
    answers.length = blocks.value.length;
    
    for(let i=0;i<blocks.value.length;i++) {
      answers[i] = new Array(blocks.value[i].questions.length);
      
      for(let j=0;j<blocks.value[i].questions.length;j++){
        const question = blocks.value[i].questions[j];
        
        if(question.type === 'blanks') {
          // 选词填空题：为每个item创建一个答案
          const itemsLength = question.items ? question.items.length : 0;
          answers[i][j] = new Array(itemsLength).fill('');
        } else if(question.type === 'multi') {
          // 多选题：初始化为空数组
          answers[i][j] = [];
        } else {
          // 单选题和开放填空题：初始化为空字符串
          answers[i][j] = '';
        }
      }
    }
  }
  if(msg.type==='hide_answers') {
    // 隐藏指定大题的答案
    console.log('收到隐藏答案通知:', msg);
    const blockIdx = msg.blockIdx;
    if (previousAnswers.value[blockIdx]) {
      previousAnswers.value[blockIdx] = null;
      
      // 移除该大题的答案显示标记
      shownAnswerBlocks.value.delete(blockIdx);
      
      ElMessage({
        message: `第 ${blockIdx + 1} 大题答案已隐藏`,
        type: 'info',
        duration: 3000,
        showClose: true
      });
    }
  }
  if(msg.type==='called') {
    // 使用弹窗提醒代替页面提醒
    ElMessage({
      message: '📢 老师点名点到你啦！！！',
      type: 'warning',
      duration: 5000,
      showClose: true
    });
  }
}
function sendHeartbeat() {
  if(socket.value?.readyState===1) {
    socket.value.send(JSON.stringify({type:'heartbeat', ts:Date.now()}));
  }
}
onMounted(()=>{
  // 检查本地存储的姓名信息，如果没有则跳转到登录界面
  const savedName = getUserNameFromLocal();
  if (!savedName || savedName === '未设置姓名') {
    router.push('/');
    return;
  }
  
  // 初始化用户姓名
  userName.value = savedName;
  
  const wsUrl = `ws://${location.hostname}:9527/ws/quiz`;
  socket.value = new WebSocket(wsUrl);
  socket.value.addEventListener('open', ()=>{
    wsStatus.value = 'connected';
    
    // 检查本地是否有保存的用户ID
    const savedUserId = getUserIdFromLocal();
    if (savedUserId) {
      // 先验证已保存的ID是否有效
      socket.value.send(JSON.stringify({ type:'verify_user_id', userId: savedUserId }));
    } else {
      // 新用户，请求初始题目
      socket.value.send(JSON.stringify({ type:'get_quiz' }));
    }
  });
  socket.value.addEventListener('message', handleWSMsg);
  setInterval(sendHeartbeat, 10000);
});
</script>

<style scoped>
.quiz-page { min-height:100vh; display:flex; justify-content:center; align-items:center; background: linear-gradient(120deg, #fcf6ba 0%, #f6d365 100%); }
.quiz-card{ width:680px; max-width:96vw; padding:30px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); position: relative; }
.user-info { position: absolute; top: 20px; right: 20px; z-index: 10; }
.name-display { display: flex; align-items: center; font-size: 14px; color: #606266; }
.name-edit { display: flex; align-items: center; }
.quiz-title{ font-weight:bold; font-size:2em; text-align:center; margin-bottom:1em; color:#d58525; }
.block-title { font-weight:600; margin-top:1.2em; margin-bottom:0.5em; }
.quiz-q-item { margin-bottom:1em; }
.quiz-q-text { font-size:1.1em; margin-bottom:0.5em; }
.block-flip-bar { text-align:center; margin-bottom:18px;}
.block-wait-tip { color:#bdbdbd; font-style:italic; }
.quiz-submit-bar { text-align:center; margin-top:2em; }

/* 答案显示时的选项颜色 */
:deep(.option-correct .el-radio__label),
:deep(.option-correct .el-checkbox__label) {
  color: #67c23a !important;
  font-weight: bold;
  background-color: #f0f9ff;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #67c23a;
}

:deep(.option-incorrect .el-radio__label),
:deep(.option-incorrect .el-checkbox__label) {
  color: #f56c6c !important;
  font-weight: bold;
  background-color: #fef0f0;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #f56c6c;
}

:deep(.option-correct .el-radio__input.is-checked .el-radio__inner),
:deep(.option-correct .el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #67c23a;
  border-color: #67c23a;
}

:deep(.option-incorrect .el-radio__input.is-checked .el-radio__inner),
:deep(.option-incorrect .el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

/* 选词填空输入框的颜色样式 */
:deep(.blank-input-correct .el-input__wrapper) {
  border-color: #67c23a !important;
  box-shadow: 0 0 0 1px #67c23a inset !important;
}

:deep(.blank-input-correct .el-input__inner) {
  color: #67c23a !important;
  font-weight: bold;
  background-color: #f0f9ff !important;
}

:deep(.blank-input-incorrect .el-input__wrapper) {
  border-color: #f56c6c !important;
  box-shadow: 0 0 0 1px #f56c6c inset !important;
}

:deep(.blank-input-incorrect .el-input__inner) {
  color: #f56c6c !important;
  font-weight: bold;
  background-color: #fef0f0 !important;
}

/* 聚焦时保持颜色 */
:deep(.blank-input-correct .el-input__wrapper:hover),
:deep(.blank-input-correct .el-input.is-focus .el-input__wrapper) {
  border-color: #67c23a !important;
  box-shadow: 0 0 0 1px #67c23a inset !important;
}

:deep(.blank-input-incorrect .el-input__wrapper:hover),
:deep(.blank-input-incorrect .el-input.is-focus .el-input__wrapper) {
  border-color: #f56c6c !important;
  box-shadow: 0 0 0 1px #f56c6c inset !important;
}

/* textarea样式 */
:deep(.blank-input-correct .el-textarea__inner) {
  color: #67c23a !important;
  font-weight: bold;
  background-color: #f0f9ff !important;
  border-color: #67c23a !important;
}

:deep(.blank-input-incorrect .el-textarea__inner) {
  color: #f56c6c !important;
  font-weight: bold;
  background-color: #fef0f0 !important;
  border-color: #f56c6c !important;
}

:deep(.blank-input-correct .el-textarea.is-focus .el-textarea__inner),
:deep(.blank-input-correct .el-textarea__inner:hover) {
  border-color: #67c23a !important;
}

:deep(.blank-input-incorrect .el-textarea.is-focus .el-textarea__inner),
:deep(.blank-input-incorrect .el-textarea__inner:hover) {
  border-color: #f56c6c !important;
}

@media (max-width:800px) {
  .quiz-card { width:100vw; min-width:unset; padding:10px; }
  .user-info { position: static; text-align: center; margin-bottom: 10px; }
}
</style>
