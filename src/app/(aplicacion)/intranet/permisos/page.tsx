import { Box, Button, Container, Typography } from "@mui/material";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import Link from "next/link";
import { CustomTable } from "@/components/CustomTable";
import { getAdminApp } from "@/lib/firebase/admin";

interface Permiso {
    id: string;
    titulo: string;
    scala: number;
}

async function getPermisos(): Promise<Permiso[]> {
    const adminApp = getAdminApp();
    const adminDb = getAdminFirestore(adminApp);
    const permisosRef = adminDb.collection("permisos");
    const q = permisosRef.orderBy("scala", "asc");
    const permisosSnapshot = await q.get();

    if (permisosSnapshot.empty) {
        return [];
    }

    const permisos = permisosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Permiso));
    return permisos;
}

export default async function PermisosPage() {
    const permisos = await getPermisos();

    const columns = [
        { id: 'titulo', label: 'Título', minWidth: 170 },
        { id: 'scala', label: 'Nivel (Scala)', minWidth: 100 },
    ];

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gestión de Permisos
                </Typography>
                <Button variant="contained" component={Link} href="/intranet/permisos/new">
                    Crear Permiso
                </Button>
            </Box>
            <CustomTable columns={columns} data={permisos} editBasePath="/intranet/permisos" />
        </Container>
    );
}
