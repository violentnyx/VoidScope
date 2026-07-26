import { RowSectionBlock } from "@/components/row-list";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getContactContent, getPagesStatus } from "@/lib/get-content";
import { isAdminRequest } from "@/lib/is-admin-request";

export default async function ContactMePage() {
  const pages = await getPagesStatus();
  if (pages.contact === "staging" && !(await isAdminRequest())) {
    return <MaintenanceScreen />;
  }

  const contact = await getContactContent();

  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">Contact Me</h1>
      <p className="mt-2 mb-6 max-w-xl text-sm text-white/60">{contact.lead}</p>

      <a
        href={`mailto:${contact.email}`}
        className="inline-block rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
      >
        {contact.emailCtaLabel}
      </a>

      <div className="mt-10">
        <RowSectionBlock
          section={{ heading: "Outros contatos", items: contact.otherContacts }}
        />
      </div>
    </div>
  );
}
