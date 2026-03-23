import { PermisoForm } from "@/components/intranet/permisos/PermisoForm";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore"; // + importa Firestore Admin para consultar datos desde el servidor
import { getAdminApp } from "@/lib/firebase/admin"; // + importa la app Admin para evitar usar el SDK web en una página server

// Define an interface for the Permiso object for type safety
interface Permiso {
    id: string;
    titulo: string;
    scala: number;
}

async function getPermiso(id: string): Promise<Permiso | null> {
    const adminApp = getAdminApp(); // + obtiene la instancia Admin inicializada para consultas del servidor
    const adminDb = getAdminFirestore(adminApp); // + obtiene Firestore Admin desde la app del servidor
    const docSnap = await adminDb.collection("permisos").doc(id).get(); // + lee el permiso directamente desde Firestore Admin
    if (docSnap.exists()) {
        // Cast the document data to our Permiso type
        return { id: docSnap.id, ...docSnap.data() } as Permiso;
    }
    return null;
}

export default async function EditPermisoPage({ params }: { params: { id: string } }) {
    const permiso = await getPermiso(params.id);
    return <PermisoForm permiso={permiso} />;
}
