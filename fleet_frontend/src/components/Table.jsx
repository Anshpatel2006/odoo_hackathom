import React from 'react';

const Table = ({ headers, data, renderRow }) => {
    return (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((header, idx) => (
                            <th
                                key={idx}
                                scope="col"
                                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length > 0 ? (
                        data.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                {renderRow(item)}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-500 italic">
                                No records found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
