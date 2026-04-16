'use client';
import { Lead } from '@/types/lead';

interface Props {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectLead: (id: string) => void;
  onSelectAll: () => void;
  loading?: boolean;
}

export default function LeadsList(props: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-6 py-3 text-left"><input type="checkbox" onChange={props.onSelectAll} /></th>
            <th className="px-6 py-3 text-left font-medium">Business</th>
            <th className="px-6 py-3 text-left font-medium">Contact</th>
            <th className="px-6 py-3 text-left font-medium">Niche</th>
            <th className="px-6 py-3 text-left font-medium">Score</th>
            <th className="px-6 py-3 text-left font-medium">City</th>
            <th className="px-6 py-3 text-left font-medium">Website</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {props.leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-6 py-3"><input type="checkbox" checked={props.selectedLeads.has(lead.id)} onChange={() => props.onSelectLead(lead.id)} /></td>
              <td className="px-6 py-3">
                <div className="font-medium">{lead.businessName}</div>
                <div className="text-xs text-gray-500">{lead.businessType}</div>
              </td>
              <td className="px-6 py-3">
                {lead.email && <div className="text-blue-600">{lead.email}</div>}
                {lead.phone && <div className="text-gray-600 text-xs">{lead.phone}</div>}
              </td>
              <td className="px-6 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{lead.niche.replace('_', ' ')}</span></td>
              <td className="px-6 py-3"><div className="font-semibold">{lead.qualityScore}</div></td>
              <td className="px-6 py-3">{lead.location.city}</td>
              <td className="px-6 py-3">
                {lead.website ? <a href={lead.website} target="_blank" className="text-blue-600 hover:underline">Visit</a> : <span className="text-gray-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
