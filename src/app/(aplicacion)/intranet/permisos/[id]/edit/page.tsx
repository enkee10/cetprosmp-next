import { PermisoForm } from "@/components/intranet/permisos/PermisoForm";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Define an interface for the Permiso object for type safety
interface Permiso {
    id: string;
    titulo: string;
    scala: number;
}

async function getPermiso(id: string): Promise<Permiso | null> {
    const docRef = doc(db, "permisos", id);
    const docSnap = await getDoc(docRef);
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