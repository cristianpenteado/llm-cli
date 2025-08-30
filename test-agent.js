const { OllamaManager } = require('./dist/ollama/OllamaManager');
const { Logger } = require('./dist/utils/Logger');

async function testAgent() {
  try {
    console.log('🚀 Testando agente básico...');
    
    const ollamaManager = new OllamaManager(true);
    await ollamaManager.initialize();
    
    console.log('✅ OllamaManager inicializado');
    
    const models = await ollamaManager.listModels();
    console.log(`📋 Modelos encontrados: ${models.length}`);
    
    if (models.length > 0) {
      const modelName = 'phi3:mini';
      console.log(`🤖 Testando resposta com ${modelName}...`);
      
      const response = await ollamaManager.sendPrompt(modelName, 'Olá! Como você está?');
      console.log(`🤖 Resposta: ${response}`);
    }
    
    console.log('✅ Teste concluído com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testAgent();
