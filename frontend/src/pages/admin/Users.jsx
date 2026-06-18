import { useState, useEffect } from 'react';
import { userService } from '../../services';
import { toast } from 'react-toastify';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers({ limit: 100 });
      // El backend devuelve un array directamente
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16">Cargando...</div>;

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="container-xl">
        <h1 className="page-header mb-8">Usuarios</h1>

        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4">Usuario</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Teléfono</th>
                <th className="text-left p-4">Rol</th>
                <th className="text-left p-4">ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-surface2/50">
                  <td className="p-4 font-medium">{user.username}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.phone || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${user.role === 'ADMIN' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted">{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
