import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Box,
  Menu,
  Button,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";

type Props = {
  onMenuClick: () => void;
};

function AppBarHeader({ onMenuClick }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static" sx={{ flex: "1 0 100%" }}>
      <Toolbar sx={{ justifyContent: "center" }}>
        <Box
        sx={{display:'flex'}}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap sx={{display: 'flex', alignItems: 'center'}}>
            <p>CETPRO</p>
          </Typography>
        </Box>

        <Box>
          <Button color="inherit" onClick={handleOpenMenu}>
            Noticias
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
          >
            <MenuItem onClick={handleCloseMenu}>Nacionales</MenuItem>
            <MenuItem onClick={handleCloseMenu}>Internacionales</MenuItem>
          </Menu>
        </Box>

        <Box>
          <Button color="inherit">Contacto</Button>
          <Button color="inherit">Acerca de</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default AppBarHeader;
