import { useEffect, useState } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  phone?: string;
}

export default function Profile() {
  const { data: user } = useGetCurrentUser({ query: { retry: false } });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<null | Address>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(`user_addresses_${user.id}`) || '[]';
      setAddresses(JSON.parse(raw));
    } catch {
      setAddresses([]);
    }
  }, [user]);

  function persist(list: Address[]) {
    if (!user) return;
    localStorage.setItem(`user_addresses_${user.id}`, JSON.stringify(list));
    setAddresses(list);
  }

  const handleAdd = () => {
    setEditing({ id: String(Date.now()), label: "Home", line1: "", line2: "", city: "", phone: "" });
  };

  const handleSave = (addr: Address) => {
    const next = addresses.some(a => a.id === addr.id) ? addresses.map(a => a.id === addr.id ? addr : a) : [...addresses, addr];
    persist(next);
    setEditing(null);
    toast.success("Address saved");
  };

  const handleDelete = (id: string) => {
    const next = addresses.filter(a => a.id !== id);
    persist(next);
    toast.success("Address removed");
  };

  if (!user) return <div className="p-8">Please log in to view your profile.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-card border border-border rounded-xl p-4">
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-sm mt-2">Phone: {user.phone || '—'}</p>
          <p className="text-sm">City: {user.city || '—'}</p>
        </div>

        <div className="md:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Saved Addresses</h2>
            <Button onClick={handleAdd}>Add Address</Button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-sm text-muted-foreground">No addresses saved yet.</div>
          ) : (
            <ul className="space-y-3">
              {addresses.map(a => (
                <li key={a.id} className="p-3 border rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-sm text-muted-foreground">{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}</div>
                    <div className="text-sm">{a.phone}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" onClick={() => setEditing(a)}>Edit</Button>
                    <Button variant="ghost" onClick={() => handleDelete(a.id)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {editing && (
            <div className="mt-4 p-4 border rounded-lg bg-background">
              <div className="grid gap-2">
                <Input placeholder="Label (Home, Work)" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
                <Input placeholder="Address line 1" value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} />
                <Input placeholder="Address line 2" value={editing.line2} onChange={(e) => setEditing({ ...editing, line2: e.target.value })} />
                <Input placeholder="City" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                <Input placeholder="Phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                <div className="flex gap-2">
                  <Button onClick={() => editing && handleSave(editing)}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
