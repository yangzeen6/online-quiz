<template>
  <div class="login-page">
    <el-card class="login-card">
      <div style="text-align:center; font-size:1.5em; margin-bottom:1em;">在线答题系统</div>
      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item label="请输入姓名">
          <el-input v-model="form.name" placeholder="请输入您的姓名" maxlength="20"></el-input>
        </el-form-item>
        <el-form-item label="请输入口令">
          <el-input v-model="form.code" maxlength="5" show-password></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%;" @click="handleLogin">进入</el-button>
        </el-form-item>
        <el-alert v-if="errorText" :title="errorText" type="error" show-icon></el-alert>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const form = reactive({ code: '', name: '' });
const errorText = ref('');

function handleLogin() {
  if (!form.name.trim()) {
    errorText.value = '请输入姓名';
    return;
  }
  
  if(form.code==='65472') {
    // 保存用户姓名到本地存储
    localStorage.setItem('quiz_user_name', form.name.trim());
    router.push('/quiz');
  } else if(form.code==='14725') {
    // 设置管理员登录标记
    sessionStorage.setItem('admin_login', 'true');
    router.push('/admin');
  } else {
    errorText.value = '口令错误，请重新输入';
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%); }
.login-card { padding: 40px 30px; min-width: 320px; box-shadow:0 4px 20px rgba(0,0,0,0.12); }
@media (max-width: 500px) {
  .login-card { min-width: unset; width:95vw; }
}
</style>

