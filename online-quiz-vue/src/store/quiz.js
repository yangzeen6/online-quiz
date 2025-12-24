import { defineStore } from 'pinia'

export const useQuizStore = defineStore('quiz', {
  state:()=>({
    blocks:[], // 题目组
    answers:[], // 答案组
    currentBlock:0
  }),
  actions:{
    setBlocks(blocksArr){
      this.blocks=blocksArr
      this.answers=blocksArr.map(b=>b.questions.map(()=>''))
    },
    setCurrentBlock(idx){
      this.currentBlock=idx
    }
  }
})
