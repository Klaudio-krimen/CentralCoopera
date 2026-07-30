import { redirect } from 'next/navigation'

// La lista de Contactos se fusionó con Clientes: cada empresa se puede
// expandir para ver/agregar sus contactos en la misma página.
export default function ContactosPage() {
  redirect('/admin/crm/clientes')
}
