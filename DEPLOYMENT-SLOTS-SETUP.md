# Configuração de Deployment Slots (Staging)

## ✅ O que foi criado

- **Produção:** https://barcoders.azurewebsites.net
- **Staging:** https://barcoders-staging.azurewebsites.net

## 📋 Configurar GitHub Actions para Staging

### 1. Adicionar Secret no GitHub

1. Abra o arquivo `staging-publish-profile.xml` que foi criado na raiz do projeto
2. Copie TODO o conteúdo XML
3. Acesse: https://github.com/joaovictor877/BARCODERS-2/settings/secrets/actions
4. Clique em **New repository secret**
5. Preencha:
   - Name: `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING`
   - Secret: Cole o conteúdo do XML
6. Clique em **Add secret**

### 2. Como funciona agora

Quando você fizer `git push`:

1. **GitHub Actions automático:**
   - Deploy para STAGING: https://barcoders-staging.azurewebsites.net
   - Deploy para PRODUÇÃO: https://barcoders.azurewebsites.net

2. **Teste no staging primeiro:**
   - Acesse https://barcoders-staging.azurewebsites.net
   - Teste todas as funcionalidades
   - Se estiver OK, a produção já está atualizada também

### 3. Configurar variáveis de ambiente no Staging

```powershell
# Configurar mesmas variáveis de ambiente da produção
az webapp config appsettings set --name barcoders-staging --resource-group juca --settings NODE_ENV=production
```

### 4. Desabilitar deploy automático em produção (opcional)

Se quiser testar APENAS no staging antes de ir pra produção:

1. Renomeie `.github/workflows/main_barcoders.yml` para `main_barcoders.yml.disabled`
2. Agora só staging recebe deploy automático
3. Quando testar e aprovar staging, faça deploy manual em produção:

```powershell
# Deploy manual do staging para produção
az webapp deployment source sync --name barcoders --resource-group juca
```

## 🔄 Workflow Recomendado

### Opção A: Deploy Automático nos Dois (atual)
```bash
git add .
git commit -m "Nova feature"
git push
# ✅ Staging atualiza automaticamente
# ✅ Produção atualiza automaticamente
```

### Opção B: Deploy Manual em Produção (mais seguro)
1. Desabilite workflow de produção (renomeie o arquivo)
2. Push vai só para staging
3. Teste em https://barcoders-staging.azurewebsites.net
4. Se OK, copie manualmente para produção:

```powershell
# Via Azure Portal
# App Service > barcoders > Deployment Center > Sync

# Ou via CLI
az webapp deployment source sync --name barcoders --resource-group juca
```

## 🗑️ Deletar Staging (se quiser economizar recursos)

```powershell
az webapp delete --name barcoders-staging --resource-group juca
```

## 💡 Dica

O staging está no mesmo plano Basic, então não tem custo extra. Use para:
- Testar mudanças antes de afetar usuários
- Debugar problemas em ambiente Azure real
- Fazer demos de novas features
