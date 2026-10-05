import { CmsEditor } from "@/components/admin/cms-editor";

export default function AdminCmsPage() {
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">Website CMS</h1><p className="mt-1 text-sm text-slate-500">Edit public section content as structured JSON. Text is rendered as text, not HTML.</p><div className="mt-6"><CmsEditor /></div></main>;
}
