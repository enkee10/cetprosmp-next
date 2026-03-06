import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LockPersonIcon from '@mui/icons-material/LockPerson';

const collections = [
    { name: 'Usuarios', path: '/intranet/users', icon: <PeopleIcon /> },
    { name: 'Permisos', path: '/intranet/permisos', icon: <LockPersonIcon /> },
];

export default function IntranetSidebar() {
    return (
        <div>
            <Toolbar />
            <Divider />
            <List>
                {collections.map((item, index) => (
                    <ListItem key={item.name} disablePadding>
                        <ListItemButton component="a" href={item.path}>
                            <ListItemIcon>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.name} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
        </div>
    );
}