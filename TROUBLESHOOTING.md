# Checklist de Diagnóstico - Site não sobe no Azure

## ✅ Arquivos Criados/Atualizados

- [x] `web.config` - Configuração IIS para Node.js
- [x] `.deployment` - Script de deployment
- [x] `deploy.cmd` - Comando de deploy Kudu
- [x] `package.json` - Adicionado engines para Node 18+
- [x] `.github/workflows/main_barcoders.yml` - Atualizado
- [x] `AZURE_SETUP.md` - Documentação de setup

## 🔍 Verificações Necessárias no Portal Azure

### 1. Configurações Gerais
- [ ] Runtime: Node 20 LTS
- [ ] Comando de inicialização: `node backend/server.js`
- [ ] Platform: Windows ou Linux?

### 2. Configurações de Aplicativo (Variáveis de Ambiente)
- [ ] `WEBSITE_NODE_DEFAULT_VERSION` = ~20
- [ ] `SCM_DO_BUILD_DURING_DEPLOYMENT` = true
- [ ] `DB_HOST` = (seu servidor MySQL)
- [ ] `DB_USER` = (seu usuário)
- [ ] `DB_PASSWORD` = (sua senha)
- [ ] `DB_NAME` = (nome do banco)

### 3. Problemas Comuns

#### ❌ Dependências Nativas (Puppeteer e Canvas)
**Problema**: `puppeteer` e `canvas` precisam de bibliotecas do sistema que podem não estar disponíveis no Azure Windows.

**Soluções**:
1. **Migrar para Azure App Service Linux** (Recomendado)
2. **Remover Puppeteer** se não for essencial
3. **Usar alternativa leve** para geração de PDF

#### ❌ Porta não configurada
**Verificado**: ✅ `process.env.PORT` está configurado corretamente

#### ❌ Módulos ES6
**Verificado**: ✅ `"type": "module"` está no package.json

### 4. Como Ver os Erros

**No Portal Azure**:
1. Vá em: **Monitoramento** > **Fluxo de log**
2. Ou: **SSH / Console** para ver logs em tempo real
3. Ou: **Diagnóstico e solução de problemas**

**Comando no Console SSH do Azure**:
```bash
cat LogFiles/Application/console.log
```

### 5. Teste de Deployment GitHub Actions

Verifique se o workflow está passando:
1. Vá no repositório GitHub
2. **Actions** > **Build and deploy Node.js app to Azure Web App**
3. Veja os logs da última execução

## 🚨 Próximos Passos

1. **Commit e Push** das alterações:
   ```bash
   git add .
   git commit -m "Adiciona configuração Azure e corrige deployment"
   git push origin main
   ```

2. **Aguarde** o GitHub Actions fazer o deploy automático

3. **Verifique os logs** no Azure Portal

4. **Se ainda não funcionar**, compartilhe:
   - Logs do Azure (Fluxo de log)
   - Logs do GitHub Actions
   - Mensagem de erro específica

## 💡 Recomendação Importante

Considerando que você usa:
- Puppeteer (geração de PDF)
- Canvas (processamento de imagens)
- Face-api.js (reconhecimento facial)

**Recomendo fortemente migrar para Azure App Service Linux**, pois essas bibliotecas funcionam melhor em ambiente Linux.

### Como migrar para Linux:
1. No Azure Portal, crie novo App Service
2. Escolha: **Linux** como sistema operacional
3. Runtime Stack: **Node 20 LTS**
4. Atualize o workflow do GitHub com o novo nome do app
