/**
 * VULNERABLE - A spreadsheet-style field compiling the user's formula with the Function constructor.
 */
import { useMemo } from 'react';

export function FormulaCell({ formula, row }) {
  const compute = useMemo(
    () => new Function('row', 'return ' + formula),
    [formula],
  );
  return <td>{compute(row)}</td>;
}
