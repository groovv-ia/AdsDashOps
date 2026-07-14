/*
# Adiciona coluna connection_method em data_connections

## Objetivo
Rastrear como cada conexão Meta Ads foi criada, permitindo diferenciar o fluxo OAuth
(login via Facebook) do fluxo de token manual (System User / token colado).

## Mudanças
- Tabela `data_connections`: nova coluna `connection_method` (text, nullable)
  - Valores possíveis: 'oauth' (login pelo Facebook), 'system_user' (token de System User), 'manual_token' (token colado manualmente)
  - Conexões existentes ficam com NULL (compatibilidade retroativa)

## Notas
- Operação segura: apenas ADD COLUMN, sem perda de dados
- Idempotente: usa IF NOT EXISTS via bloco DO
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'data_connections'
      AND column_name = 'connection_method'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE data_connections ADD COLUMN connection_method text;
  END IF;
END $$;
