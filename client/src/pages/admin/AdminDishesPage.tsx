import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTitle } from '../../hooks/useTitle';
import { api, errorMessage } from '../../lib/api';
import { formatDay, formatPrice } from '../../lib/format';
import type { Dish, DishType } from '../../lib/types';

const todayInParis = () =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  );

const EMPTY_FORM = { nom: '', description: '', prix: '', type: 'PLAT' as DishType, allergenes: '', imageUrl: '' };

export function AdminDishesPage() {
  useTitle('Plats du jour');
  const [date, setDate] = useState(todayInParis);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    api<Dish[]>(`/admin/plats?date=${date}`)
      .then(setDishes)
      .catch((err) => setMessage({ ok: false, text: errorMessage(err) }));
  }, [date]);
  useEffect(load, [load]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function edit(dish: Dish) {
    setEditingId(dish.id);
    setForm({
      nom: dish.nom,
      description: dish.description,
      prix: (dish.prixCentimes / 100).toFixed(2),
      type: dish.type,
      allergenes: dish.allergenes.join(', '),
      imageUrl: dish.imageUrl ?? '',
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = {
      nom: form.nom,
      description: form.description,
      prixCentimes: Math.round(Number(form.prix.replace(',', '.')) * 100),
      type: form.type,
      date,
      allergenes: form.allergenes
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      imageUrl: form.imageUrl || undefined,
    };
    try {
      await (editingId ? api(`/admin/plats/${editingId}`, 'PUT', body) : api('/admin/plats', 'POST', body));
      setMessage({ ok: true, text: editingId ? 'Plat modifié.' : 'Plat ajouté au menu.' });
      reset();
      load();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
  }

  async function remove(dish: Dish) {
    if (!window.confirm(`Retirer « ${dish.nom} » du menu ?`)) return;
    try {
      await api(`/admin/plats/${dish.id}`, 'DELETE');
      load();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
  }

  const count = (type: DishType) => dishes.filter((d) => d.type === type).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 32 }}>Plats du jour</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            2 plats et 2 desserts par jour · {formatDay(date)} : {count('PLAT')}/2 plats, {count('DESSERT')}/2 desserts
          </p>
        </div>
        <div className="field">
          <label htmlFor="jour">Jour du menu</label>
          <input id="jour" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="layout-with-aside" style={{ gridTemplateColumns: 'minmax(0, 1fr) 360px' }}>
        <section className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Nom</th>
                  <th>Prix</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dishes.map((dish) => (
                  <tr key={dish.id}>
                    <td>
                      <span className={`badge ${dish.type === 'PLAT' ? 'badge-orange' : 'badge-blue'}`}>
                        {dish.type === 'PLAT' ? 'Plat' : 'Dessert'}
                      </span>
                    </td>
                    <td>
                      <strong>{dish.nom}</strong>
                      <div className="muted small">{dish.description}</div>
                    </td>
                    <td>{formatPrice(dish.prixCentimes)}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => edit(dish)}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => remove(dish)}>
                          Retirer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dishes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Aucun plat pour ce jour.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form className="card stack" onSubmit={submit}>
          <h2 style={{ fontSize: 18 }}>{editingId ? 'Modifier le plat' : 'Ajouter un plat'}</h2>
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" value={form.type} onChange={set('type')}>
              <option value="PLAT">Plat</option>
              <option value="DESSERT">Dessert</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="nom">Nom</label>
            <input id="nom" required maxLength={80} value={form.nom} onChange={set('nom')} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" required maxLength={300} value={form.description} onChange={set('description')} />
          </div>
          <div className="field">
            <label htmlFor="prix">Prix (€)</label>
            <input id="prix" required inputMode="decimal" placeholder="12,50" value={form.prix} onChange={set('prix')} />
          </div>
          <div className="field">
            <label htmlFor="allergenes">Allergènes</label>
            <input id="allergenes" placeholder="gluten, lait" value={form.allergenes} onChange={set('allergenes')} />
            <span className="hint">Séparés par des virgules</span>
          </div>
          <div className="field">
            <label htmlFor="image">URL de la photo (facultatif)</label>
            <input id="image" type="url" value={form.imageUrl} onChange={set('imageUrl')} />
          </div>
          {message && (
            <p className={`alert ${message.ok ? 'alert-success' : 'alert-error'}`} role="status" style={{ margin: 0 }}>
              {message.text}
            </p>
          )}
          <div className="row">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={reset}>
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
