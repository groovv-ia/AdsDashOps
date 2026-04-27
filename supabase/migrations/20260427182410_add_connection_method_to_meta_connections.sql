/*
  # Adicionar coluna connection_method em meta_connections

  ## Objetivo
  Diferenciar como cada conexao Meta foi estabelecida:
  - 'manual': conexao via formulario com Business Manager ID + System User Token (metodo antigo)
  - 'flfb': conexao via Facebook Login for Business (novo metodo automatico, gera BISUAT permanente)

  ## Alteracoes
  - Tabela `meta_connections`: nova coluna `connection_method` (text, default 'manual')

  ## Notas
  - Registros existentes recebem automaticamente o valor 'manual' pelo DEFAULT
  - Nenhum dado e perdido ou alterado
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_connections' AND column_name = 'connection_method'
  ) THEN
    ALTER TABLE meta_connections
      ADD COLUMN connection_method text NOT NULL DEFAULT 'manual'
      CHECK (connection_method IN ('manual', 'flfb'));
  END IF;
END $$;
