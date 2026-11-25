import { useEffect, useState } from 'react';
import { api } from '../api';
import { fmtDate, fmtMinutes } from '../hooks';
import ErrorBox from '../components/ErrorBox';

const TYPE = { bonus: 'Bono', credit: 'Ganaste', debit: 'Gastaste' };

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api('/api/wallet'), api('/api/wallet/transactions')])
      .then(([w, t]) => { setWallet(w); setTxs(t); })
      .catch(setError);
  }, []);

  return (
    <section>
      <ErrorBox error={error} />
      <div className="card">
        <p className="muted">Saldo disponible</p>
        <p className="big" data-testid="balance">{wallet ? fmtMinutes(wallet.balanceMinutes) : '…'}</p>
      </div>
      <div className="card">
        <h2>Historial de movimientos</h2>
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Monto</th><th>Saldo</th></tr></thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id}>
                <td>{fmtDate(t.createdAt)}</td>
                <td>{TYPE[t.type]}</td>
                <td>{t.description}</td>
                <td className={t.type === 'debit' ? 'neg' : 'pos'}>
                  {t.type === 'debit' ? '−' : '+'}{fmtMinutes(t.amountMinutes)}
                </td>
                <td>{fmtMinutes(t.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
