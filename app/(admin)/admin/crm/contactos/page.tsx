import { prisma } from '@/lib/db'
import { UserPlus } from 'lucide-react'
import ContactsTable from '@/components/crm/ContactsTable'
import ContactoModal from '@/components/ui/ContactoModal'

async function getData() {
  const [contacts, empresas] = await Promise.all([
    prisma.contact.findMany({
      where: { isActive: true },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  return { contacts, empresas }
}

export default async function ContactosPage() {
  const { contacts, empresas } = await getData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Contactos</h1>
          <p className="text-crm-muted text-sm mt-1">
            {contacts.length} contacto{contacts.length !== 1 ? 's' : ''} en todas las empresas
          </p>
        </div>
        <ContactoModal
          empresas={empresas}
          trigger={
            <button className="crm-btn-primary">
              <UserPlus className="h-4 w-4" />
              Nuevo Contacto
            </button>
          }
        />
      </div>

      <ContactsTable contacts={contacts as any} />
    </div>
  )
}
