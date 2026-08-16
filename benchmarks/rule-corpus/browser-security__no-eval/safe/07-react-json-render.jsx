/**
 * SAFE - A React component that renders parsed data. No code execution anywhere.
 */
import { useMemo } from 'react';

export function ConfigTable({ raw }) {
  const rows = useMemo(() => JSON.parse(raw), [raw]);
  return (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
