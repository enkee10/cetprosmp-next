import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Button,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const Busqueda = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState("");

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleBuscar = () => {
    console.log("Buscar:", query);
    handleClose();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <SearchIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem disableRipple>
          <Box display="flex" gap={1}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="contained" onClick={handleBuscar}>
              Buscar
            </Button>
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
};

export default Busqueda;
