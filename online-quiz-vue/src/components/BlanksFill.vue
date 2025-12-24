<template>
  <div>
    <div style="line-height: 1.8; margin-bottom: 10px;">
      <span v-for="(item, i) in q.sentenceBlanks" :key="i">
        <template v-if="item.type==='text'">
          {{ item.val }}
        </template>
        <template v-else>
          <el-input
            :model-value="modelValue[getBlankIndex(i)]"
            :disabled="disabled"
            style="min-width:120px; width:120px; display:inline-block; margin:0 5px; vertical-align: middle;"
            placeholder="请输入答案"
            @update:model-value="v => updateBlank(getBlankIndex(i), v)"
          />
        </template>
      </span>
    </div>
    <div style="margin-top:15px; padding:10px; background:#f5f7fa; border-radius:4px;">
      <strong>参考词汇：</strong>
      <span v-for="(word, idx) in q.options" :key="word" style="margin-right:15px; color:#409eff;">
        {{ word }}{{ idx < q.options.length - 1 ? ',' : '' }}
      </span>
    </div>
  </div>
</template>


<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  q: Object,
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue']);

// 获取空白处的实际索引（只计算type为'blank'的项）
function getBlankIndex(sentenceIndex) {
  let blankCount = 0;
  for (let i = 0; i <= sentenceIndex; i++) {
    if (props.q.sentenceBlanks[i].type === 'blank') {
      if (i === sentenceIndex) return blankCount;
      blankCount++;
    }
  }
  return blankCount;
}

function updateBlank(blankIndex, v) {
  const updated = [...(props.modelValue || [])];
  updated[blankIndex] = v;
  emit('update:modelValue', updated);
}
</script>

