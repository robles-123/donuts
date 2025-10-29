import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { user, updateProfile, orderHistory } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      updateProfile({ name, email });
      alert('Profile updated');
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
    setSaving(false);
  };

  if (!user) return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-semibold">No user logged in</h2>
      <p className="text-sm text-gray-600">Please login to view or edit your profile.</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-lg" />
        </div>
        <div>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-amber-500 text-white rounded-lg">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-2">Order history</h3>
      {orderHistory && orderHistory.length > 0 ? (
        <div className="space-y-3">
          {orderHistory.map(o => (
            <div key={o.id} className="p-3 bg-white rounded-lg shadow-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">Order #{o.id}</div>
                  <div className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₱{o.total}</div>
                  <div className="text-sm text-gray-500">{o.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No orders yet.</p>
      )}
    </div>
  );
};

export default Profile;
