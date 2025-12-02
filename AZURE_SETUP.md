# Configuração do Azure para Barcoders

## Passos para Deploy no Azure

### 1. Configurações de Aplicativo no Azure Portal

No portal do Azure, vá em **Configuração** > **Configurações do aplicativo** e adicione as seguintes variáveis:

```
WEBSITE_NODE_DEFAULT_VERSION=~20
SCM_DO_BUILD_DURING_DEPLOYMENT=true
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### 2. Configurações de Banco de Dados

Adicione as variáveis de ambiente do MySQL:
```
DB_HOST=<seu-servidor-mysql>
DB_USER=<seu-usuario>
DB_PASSWORD=<sua-senha>
DB_NAME=<nome-do-banco>
```

### 3. Configurações Gerais

Em **Configuração** > **Configurações gerais**:
- **Pilha de runtime**: Node
- **Versão do Node**: 20 LTS
- **Comando de inicialização**: `node backend/server.js`

### 4. Problemas Comuns

#### Puppeteer não funciona
O Puppeteer requer Chrome/Chromium instalado. No Azure App Service Windows, considere:
- Usar uma alternativa mais leve para gerar PDFs
- Migrar para Azure App Service Linux
- Usar Azure Functions com container customizado

#### Canvas não compila
A biblioteca `canvas` requer dependências nativas. Se houver erro:
- Use Azure App Service Linux
- Ou remova a dependência se não for crítica

### 5. Deployment via GitHub Actions

O deploy automático está configurado em `.github/workflows/main_barcoders.yml`

Certifique-se de que os secrets estão configurados no repositório GitHub:
- `AZUREAPPSERVICE_CLIENTID_*`
- `AZUREAPPSERVICE_TENANTID_*`
- `AZUREAPPSERVICE_SUBSCRIPTIONID_*`

### 6. Logs de Diagnóstico

Para ver os logs de erro:
1. Vá no Portal Azure > Seu App Service
2. **Monitoramento** > **Fluxo de log**
3. **Diagnóstico e solução de problemas**

### 7. Verificação do Deploy

Após o deploy, acesse: `https://barcoders.azurewebsites.net`

Se não carregar, verifique:
- Logs de aplicativo
- Configurações de porta (deve usar `process.env.PORT`)
- Dependências instaladas corretamente
