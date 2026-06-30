export const teamStocksModel = `
  CREATE TABLE IF NOT EXISTS team_stocks (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    stock_id INT REFERENCES stocks(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    UNIQUE (team_id, stock_id)
  );
`;
