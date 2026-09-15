'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DocumentLogsPage() {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch(`/api/meetings/documents/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [id]);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Access Logs for Document #{id}</h1>
        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p>No one has accessed this document yet.</p>
        ) : (
          <table className="min-w-full bg-white shadow rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">{log.user}</td>
                  <td className="px-4 py-2">{log.action}</td>
                  <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          onClick={() => window.history.back()}
          className="mt-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    </div>
  );
}