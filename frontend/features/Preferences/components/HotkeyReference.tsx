const HotkeyReference = ({
  hotkeys,
}: {
  hotkeys: { key: string; action: string }[];
}) => {
  return (
    <div className='max-w-md'>
      <h5 className='mb-2 text-lg'>Hotkey Reference</h5>
      <div className='overflow-x-auto'>
        <table className='min-w-full overflow-hidden rounded-lg'>
          <thead className='bg-[var(--card-color)]'>
            <tr>
              <th className='bg-[var(--border-color)] px-4 py-2 text-left'>
                Key
              </th>
              <th className='bg-[var(--border-color)] px-4 py-2 text-left'>
                Action
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-[var(--border-color)]'>
            {hotkeys.map((hotkey, index) => (
              <tr key={index} className={'bg-[var(--card-color)]'}>
                <td className='bg-[var(--card-color)] px-4 py-3 font-mono'>
                  <kbd className='rounded-md bg-[var(--border-color)] px-2 py-1'>
                    {hotkey.key}
                  </kbd>
                </td>
                <td className='px-4 py-2'>{hotkey.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HotkeyReference;
