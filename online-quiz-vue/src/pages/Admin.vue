<template>
  <div class="admin-page">
    <el-card class="admin-card">
      <div class="admin-title">
        管理员面板 
        <span class="online-count">（当前在线人数：{{users.length}}）</span>
        <el-button 
          link 
          size="small" 
          @click="logout" 
          style="float: right; margin-top: 5px; color: #666;">
          退出登录
        </el-button>
      </div>
      <div v-if="wsStatus!=='connected'" class="ws-status">正在连接服务器...</div>
      <div v-else>
        <!-- 全局状态显示 -->
        <div style="margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #409eff;">
          <div style="text-align: center;">
            <strong style="color: #409eff;">当前开放大题：第 {{currentBlock + 1}} 大题</strong>
            <span style="margin-left: 10px; color: #666;">(共 {{totalBlocks}} 大题)</span>
          </div>
        </div>

        <el-table :data="sortedUsers" border style="margin-bottom: 1em;" :row-class-name="getRowClassName">
          <el-table-column prop="name" label="姓名" width="120"/>
          <el-table-column label="完成率" width="120" sortable :sort-method="sortByCompletionRate">
            <template #default="scope">
              <div style="display: flex; align-items: center;">
                <el-progress 
                  :percentage="getUserCompletionRate(scope.row)" 
                  :stroke-width="8"
                  :show-text="false"
                  style="flex: 1; margin-right: 8px;"
                />
                <span style="font-size: 12px; color: #666;">{{getUserCompletionRate(scope.row)}}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="called" label="点名" width="80">
            <template #default="scope">
              <el-tag v-if="scope.row.called" type="danger">被点名</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" @click="viewUserAnswers(scope.row)">查看答案</el-button>
              <el-button size="small" type="warning" @click="callUser(scope.row)" style="margin-left: 12px;">点名</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-bottom: 1em;">
          <el-button @click="requestUserList">刷新列表</el-button>
          <el-button type="primary" @click="randomSelectUser" style="margin-left: 12px;">🎲 随机抽人</el-button>
        </div>

        <!-- 全部题目和答案显示区域 -->
        <div style="margin-top: 30px; padding: 20px; border: 1px solid #e4e7ed; border-radius: 8px; background: #fafafa;">
          <div style="font-size: 1.3em; font-weight: bold; color: #409eff; margin-bottom: 20px; text-align: center;">
            📋 全部题目管理
          </div>
          
          <div v-for="(block, blockIdx) in allQuestions" :key="blockIdx" style="margin-bottom: 30px; border: 1px solid #e4e7ed; border-radius: 8px; background: #fff;">
            <!-- 大题标题和控制按钮 -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e4e7ed;">
              <div style="font-size: 1.1em; font-weight: 600; color: #409eff;">
                第{{blockIdx + 1}}大题：{{block.title}}
                <el-tag size="small" type="info" style="margin-left: 10px;">
                  完成率: {{getBlockCompletionRate(blockIdx)}}%
                </el-tag>
              </div>
              <div>
                <!-- 未开放状态：显示开放按钮 -->
                <el-button 
                  v-if="!isBlockOpened(blockIdx)"
                  type="primary" 
                  size="small"
                  :disabled="!canOpenBlock(blockIdx)"
                  @click="openBlock(blockIdx)">
                  开放大题
                </el-button>
                
                <!-- 已开放但答案未显示：显示答案按钮 -->
                <el-button 
                  v-else-if="!isAnswerShown(blockIdx)"
                  type="success" 
                  size="small"
                  @click="showBlockAnswers(blockIdx)">
                  显示答案
                </el-button>
                
                <!-- 答案已显示：隐藏答案按钮 -->
                <el-button 
                  v-else
                  type="warning" 
                  size="small"
                  @click="hideBlockAnswers(blockIdx)">
                  隐藏答案
                </el-button>
                
                <!-- 状态标识 -->
                <el-tag 
                  v-if="isBlockOpened(blockIdx)" 
                  :type="isAnswerShown(blockIdx) ? 'success' : 'primary'" 
                  size="small" 
                  style="margin-left: 10px;">
                  {{isAnswerShown(blockIdx) ? '答案已显示' : '已开放'}}
                </el-tag>
                <el-tag v-else type="info" size="small" style="margin-left: 10px;">
                  未开放
                </el-tag>
              </div>
            </div>
            
            <!-- 题目列表 -->
            <div style="padding: 15px;">
              <div v-for="(item, qIdx) in block.items" :key="qIdx" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e4e7ed;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 8px; color: #333;">
                      {{item.questionNumber}}. {{item.question}}
                    </div>
                    <div style="color: #67c23a; font-weight: 600; margin-bottom: 10px;">
                      标准答案：{{item.answer}}
                    </div>
                    <div class="completion-stats">
                      <el-tag size="small" type="primary">
                        完成率: {{getQuestionCompletionRate(blockIdx, qIdx)}}%
                      </el-tag>
                      <el-tag size="small" type="success">
                        正确率: {{getQuestionAccuracyRate(blockIdx, qIdx)}}%
                      </el-tag>
                    </div>
                  </div>
                  <el-button size="small" type="primary" @click="viewQuestionAnswers(blockIdx, qIdx, item)">
                    查看作答 ({{getUserAnswersCount(blockIdx, qIdx)}})
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 查看题目作答情况对话框 -->
        <el-dialog v-model="showQuestionAnswersDialog" :title="`题目 ${selectedQuestion?.questionNumber} 的作答情况`" width="70%">
          <div v-if="selectedQuestion">
            <div style="margin-bottom: 15px; padding: 10px; background: #f0f9ff; border-radius: 6px;">
              <strong>题目：</strong>{{selectedQuestion.question}}<br/>
              <strong style="color: #67c23a;">标准答案：</strong>{{selectedQuestion.answer}}
            </div>
            
            <el-table :data="questionUserAnswers" border>
              <el-table-column prop="name" label="姓名" width="120"/>
              <el-table-column label="用户答案">
                <template #default="scope">
                  <span v-if="scope.row.answer">{{scope.row.answer}}</span>
                  <span v-else style="color: #999;">未作答</span>
                </template>
              </el-table-column>
              <el-table-column label="正确性" width="100">
                <template #default="scope">
                  <el-tag v-if="scope.row.answer" :type="isAnswerCorrect(scope.row.answer, selectedQuestion.answer) ? 'success' : 'danger'">
                    {{isAnswerCorrect(scope.row.answer, selectedQuestion.answer) ? '正确' : '错误'}}
                  </el-tag>
                  <el-tag v-else type="info">未答</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-dialog>

        <!-- 答案查看对话框 -->
        <el-dialog v-model="showAnswersDialog" :title="`${selectedUser?.name || selectedUser?.nickname} 的答案`" width="60%">
          <div v-if="selectedUserAnswers">
            <div v-for="(blockAnswers, blockIdx) in selectedUserAnswers" :key="blockIdx" style="margin-bottom: 20px;">
              <h4>第{{parseInt(blockIdx)+1}}大题：</h4>
              <div v-for="(answer, questionIdx) in blockAnswers" :key="questionIdx" style="margin-left: 20px; margin-bottom: 10px;">
                <strong>题目{{parseInt(questionIdx)+1}}：</strong>
                <span v-if="Array.isArray(answer)">{{answer.join(', ')}}</span>
                <span v-else>{{answer}}</span>
              </div>
            </div>
          </div>
          <div v-else>
            <p>该用户暂无答题记录</p>
          </div>
        </el-dialog>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const wsStatus = ref('connecting');
const users = ref([]);
const socket = ref(null);
const currentBlock = ref(0);
const totalBlocks = ref(0);
const showAnswersDialog = ref(false);
const selectedUser = ref(null);
const selectedUserAnswers = ref(null);
const allQuestions = ref([]); // 存储所有题目和答案
const showQuestionAnswersDialog = ref(false);
const selectedQuestion = ref(null);
const questionUserAnswers = ref([]);
const openedBlocks = ref(new Set([0])); // 已开放的大题，初始只有第一大题
const shownAnswers = ref(new Set()); // 已显示答案的大题
const highlightedUserId = ref(null); // 当前高亮的用户ID

// 计算总题目数量
const totalQuestions = computed(() => {
  let total = 0;
  allQuestions.value.forEach(block => {
    total += block.items ? block.items.length : 0;
  });
  return total;
});

// 按完成率排序的用户列表
const sortedUsers = computed(() => {
  return [...users.value].sort((a, b) => {
    const rateA = getUserCompletionRate(a);
    const rateB = getUserCompletionRate(b);
    return rateB - rateA; // 降序排列
  });
});

// 计算用户完成率
function getUserCompletionRate(user) {
  if (!user.answers || totalQuestions.value === 0) return 0;
  
  let completedCount = 0;
  
  for (let blockIdx in user.answers) {
    const blockAnswers = user.answers[blockIdx];
    for (let questionKey in blockAnswers) {
      const answer = blockAnswers[questionKey];
      // 检查答案是否有效（非空且非空数组）
      if (answer && (typeof answer === 'string' ? answer.trim() : true) && 
          (Array.isArray(answer) ? answer.length > 0 : true)) {
        completedCount++;
      }
    }
  }
  
  return Math.round((completedCount / totalQuestions.value) * 100);
}

// 计算大题完成率
function getBlockCompletionRate(blockIdx) {
  if (users.value.length === 0) return 0;
  
  let completedUsers = 0;
  
  users.value.forEach(user => {
    if (user.answers && user.answers[blockIdx]) {
      const blockAnswers = user.answers[blockIdx];
      const block = allQuestions.value[blockIdx];
      
      if (block && block.items) {
        let blockCompleted = true;
        
        // 检查该用户是否完成了这个大题的所有小题
        for (let qIdx = 0; qIdx < block.items.length; qIdx++) {
          const question = block.items[qIdx];
          let hasAnswer = false;
          
          if (question.isBlankItem) {
            const key = `${question.originalQuestionIdx}_${question.itemIdx}`;
            hasAnswer = blockAnswers[key] && blockAnswers[key].trim();
          } else {
            hasAnswer = blockAnswers[qIdx] && 
              (Array.isArray(blockAnswers[qIdx]) ? blockAnswers[qIdx].length > 0 : blockAnswers[qIdx].trim());
          }
          
          if (!hasAnswer) {
            blockCompleted = false;
            break;
          }
        }
        
        if (blockCompleted) {
          completedUsers++;
        }
      }
    }
  });
  
  return Math.round((completedUsers / users.value.length) * 100);
}

// 计算小题完成率
function getQuestionCompletionRate(blockIdx, questionIdx) {
  if (users.value.length === 0) return 0;
  
  let completedUsers = 0;
  
  users.value.forEach(user => {
    if (user.answers && user.answers[blockIdx]) {
      const question = allQuestions.value[blockIdx]?.items[questionIdx];
      if (!question) return;
      
      let hasAnswer = false;
      
      if (question.isBlankItem) {
        const key = `${question.originalQuestionIdx}_${question.itemIdx}`;
        hasAnswer = user.answers[blockIdx][key] && user.answers[blockIdx][key].trim();
      } else {
        const answer = user.answers[blockIdx][questionIdx];
        hasAnswer = answer && (Array.isArray(answer) ? answer.length > 0 : answer.trim());
      }
      
      if (hasAnswer) {
        completedUsers++;
      }
    }
  });
  
  return Math.round((completedUsers / users.value.length) * 100);
}

// 计算小题正确率
function getQuestionAccuracyRate(blockIdx, questionIdx) {
  const question = allQuestions.value[blockIdx]?.items[questionIdx];
  if (!question) return 0;
  
  let completedUsers = 0;
  let correctUsers = 0;
  
  users.value.forEach(user => {
    if (user.answers && user.answers[blockIdx]) {
      let userAnswer = '';
      let hasAnswer = false;
      
      if (question.isBlankItem) {
        const key = `${question.originalQuestionIdx}_${question.itemIdx}`;
        userAnswer = user.answers[blockIdx][key] || '';
        hasAnswer = userAnswer.trim();
      } else {
        const answer = user.answers[blockIdx][questionIdx];
        if (Array.isArray(answer)) {
          userAnswer = answer.join(', ');
          hasAnswer = answer.length > 0;
        } else {
          userAnswer = answer || '';
          hasAnswer = userAnswer.trim();
        }
      }
      
      if (hasAnswer) {
        completedUsers++;
        if (isAnswerCorrect(userAnswer, question.answer)) {
          correctUsers++;
        }
      }
    }
  });
  
  return completedUsers > 0 ? Math.round((correctUsers / completedUsers) * 100) : 0;
}

// 排序方法
function sortByCompletionRate(a, b) {
  return getUserCompletionRate(b) - getUserCompletionRate(a);
}

function handleWSMsg(ev) {
  let msg = {};
  try{ msg = JSON.parse(ev.data);}catch{return;}
  if(msg.type==='user_list'){
    users.value = msg.users;
    currentBlock.value = msg.currentBlock;
    totalBlocks.value = msg.totalBlocks;
    // 用户列表更新后，sortedUsers会自动重新计算
  }
  if(msg.type==='all_questions') {
    allQuestions.value = msg.questions;
  }
}

function requestUserList(){
  socket.value.send(JSON.stringify({type:'get_user_list'}));
}

// 检查大题是否已开放
function isBlockOpened(blockIdx) {
  return openedBlocks.value.has(blockIdx);
}

// 检查是否可以开放大题（只能按顺序开放）
function canOpenBlock(blockIdx) {
  if (blockIdx === 0) return true; // 第一大题总是可以开放
  return openedBlocks.value.has(blockIdx - 1); // 前一大题必须已开放
}

// 检查答案是否已显示
function isAnswerShown(blockIdx) {
  return shownAnswers.value.has(blockIdx);
}

// 开放大题
function openBlock(blockIdx) {
  socket.value.send(JSON.stringify({type:'open_block', blockIdx: blockIdx}));
  openedBlocks.value.add(blockIdx);
  currentBlock.value = Math.max(currentBlock.value, blockIdx);
  
  ElMessage({
    message: `第 ${blockIdx + 1} 大题已开放！`,
    type: 'success',
    duration: 3000
  });
}

// 显示大题答案
function showBlockAnswers(blockIdx) {
  socket.value.send(JSON.stringify({type:'show_block_answers', blockIdx: blockIdx}));
  shownAnswers.value.add(blockIdx);
  
  ElMessage({
    message: `第 ${blockIdx + 1} 大题答案已显示！`,
    type: 'success',
    duration: 3000
  });
}

// 隐藏大题答案
function hideBlockAnswers(blockIdx) {
  socket.value.send(JSON.stringify({type:'hide_block_answers', blockIdx: blockIdx}));
  shownAnswers.value.delete(blockIdx);
  
  ElMessage({
    message: `第 ${blockIdx + 1} 大题答案已隐藏！`,
    type: 'info',
    duration: 3000
  });
}

function openNextBlock() {
  socket.value.send(JSON.stringify({type:'open_next_block'}));
  
  // 显示成功提示
  ElMessage({
    message: `第 ${currentBlock.value + 2} 大题已开放！`,
    type: 'success',
    duration: 3000
  });
}

function showFinalAnswers() {
  socket.value.send(JSON.stringify({type:'show_final_answers'}));
  
  // 显示成功提示
  ElMessage({
    message: '最后一题答案已显示给所有用户！',
    type: 'success',
    duration: 3000
  });
}

function callUser(row) {
  socket.value.send(JSON.stringify({type:'call_user', user:row.nickname}));
}

function viewUserAnswers(user) {
  selectedUser.value = user;
  selectedUserAnswers.value = user.answers;
  showAnswersDialog.value = true;
}

function viewQuestionAnswers(blockIdx, questionIdx, question) {
  selectedQuestion.value = question;
  
  // 收集所有用户对这个题目的答案
  questionUserAnswers.value = users.value.map(user => {
    let userAnswer = '';
    
    if (user.answers && user.answers[blockIdx]) {
      if (question.isBlankItem) {
        // 选词填空题的特殊处理
        const key = `${question.originalQuestionIdx}_${question.itemIdx}`;
        userAnswer = user.answers[blockIdx][key] || '';
      } else {
        // 普通题目
        userAnswer = user.answers[blockIdx][questionIdx] || '';
        if (Array.isArray(userAnswer)) {
          userAnswer = userAnswer.join(', ');
        }
      }
    }
    
    return {
      nickname: user.nickname,
      name: user.name || '未设置姓名',
      answer: userAnswer
    };
  });
  
  showQuestionAnswersDialog.value = true;
}

function getUserAnswersCount(blockIdx, questionIdx) {
  return users.value.filter(user => {
    if (!user.answers || !user.answers[blockIdx]) return false;
    
    const question = allQuestions.value[blockIdx]?.items[questionIdx];
    if (!question) return false;
    
    if (question.isBlankItem) {
      const key = `${question.originalQuestionIdx}_${question.itemIdx}`;
      return user.answers[blockIdx][key];
    } else {
      return user.answers[blockIdx][questionIdx];
    }
  }).length;
}

function isAnswerCorrect(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;
  
  // 处理多选题的无序比较
  if (userAnswer.includes(',') || correctAnswer.includes(',')) {
    // 多选题：将答案分割并排序后比较
    const userAnswers = userAnswer.split(',').map(s => s.trim().toLowerCase()).sort();
    const correctAnswers = correctAnswer.split(',').map(s => s.trim().toLowerCase()).sort();
    
    if (userAnswers.length !== correctAnswers.length) return false;
    
    return userAnswers.every((answer, index) => answer === correctAnswers[index]);
  }
  
  // 单选题或其他题型：简单的字符串比较
  return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
}

// 随机抽人功能
function randomSelectUser() {
  if (users.value.length === 0) {
    ElMessage.warning('当前没有在线用户');
    return;
  }
  
  // 随机选择一个用户
  const randomIndex = Math.floor(Math.random() * users.value.length);
  const selectedUser = users.value[randomIndex];
  
  // 高亮显示选中的用户
  highlightedUserId.value = selectedUser.userId;
  
  // 显示选中结果
  ElMessage({
    message: `🎯 随机选中：${selectedUser.name || '未设置姓名'}`,
    type: 'success',
    duration: 2000
  });
  
  // 1秒后取消高亮
  setTimeout(() => {
    highlightedUserId.value = null;
  }, 1000);
}

// 获取表格行的CSS类名
function getRowClassName({ row }) {
  if (highlightedUserId.value && row.userId === highlightedUserId.value) {
    return 'highlighted-row';
  }
  return '';
}

// 退出登录
function logout() {
  sessionStorage.removeItem('admin_login');
  router.push('/');
}

onMounted(()=>{
  // 检查是否通过正确的登录流程进入（管理员不需要姓名，但需要通过login界面）
  // 检查sessionStorage中是否有admin登录标记
  const adminLogin = sessionStorage.getItem('admin_login');
  if (!adminLogin) {
    router.push('/');
    return;
  }
  
  const wsUrl = `ws://${location.hostname}:9527/ws/admin`;
  socket.value = new WebSocket(wsUrl);
  socket.value.addEventListener('open', ()=>{
    wsStatus.value = 'connected';
    requestUserList();
    // 请求所有题目和答案
    socket.value.send(JSON.stringify({type:'get_all_questions'}));
  });
  socket.value.addEventListener('message', handleWSMsg);
});
</script>

<style scoped>
.admin-page { min-height: 100vh; display:flex; justify-content: center; align-items: center; background: linear-gradient(120deg, #eea2a2 0%, #bbc1bf 100%); }
.admin-card { width:700px; max-width:97vw; padding:30px; box-shadow:0 4px 24px rgba(0,0,0,0.10); }
.admin-title { font-size:2em; color:#804040; text-align: center; margin-bottom:2em; font-weight:700; }
.online-count{ font-size:1rem; color:#4c7b96; font-weight:400; }

/* 高亮行样式 */
:deep(.highlighted-row) {
  background-color: #ffd700 !important;
  animation: highlight-pulse 1s ease-in-out;
}

:deep(.highlighted-row td) {
  background-color: #ffd700 !important;
  font-weight: bold;
  color: #333 !important;
}

@keyframes highlight-pulse {
  0% { 
    background-color: #ffd700;
    transform: scale(1);
  }
  50% { 
    background-color: #ffed4e;
    transform: scale(1.02);
  }
  100% { 
    background-color: #ffd700;
    transform: scale(1);
  }
}

@media (max-width:900px) {
  .admin-card { width:100vw; min-width: unset; padding:10px; }
}

/* 进度条样式优化 */
:deep(.el-progress-bar__outer) {
  background-color: #f0f2f5;
}

:deep(.el-progress-bar__inner) {
  transition: width 0.3s ease;
}

/* 完成率标签样式 */
.completion-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.completion-stats .el-tag {
  font-size: 11px;
  padding: 2px 6px;
}
</style>