import React, { useState } from "react";
import { IconButton, Menu, Box, Typography, Avatar } from "@mui/material";
import { googleApps } from "./data/googleApps";
import { useAuth } from "@/context/AuthContext";

export default function Apps() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useAuth(); // ← Updated to useAuth

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <span className="material-symbols-outlined">apps</span>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 328,
            maxHeight: 400,
            p: 0.7,
            borderRadius: 6,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1.25,
            maxHeight: 350,
            overflowY: "auto",
            py: 1.5,
            px: 1,
            scrollbarGutter: "stable",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#ccc",
              borderRadius: 3,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
          }}
        >
          {googleApps.map((app) => (
            <Box
              key={app.name}
              component="a"
              href={app.url}
              target="_blank"
              rel="noopener"
              sx={{
                textDecoration: "none",
                textAlign: "center",
                color: "text.primary",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderRadius: 2,
                },
                py: 0.5,
                px: 1,
              }}
              onClick={handleClose}
            >
              {/* Updated user properties */}
              {app.name === "Cuenta" && user?.photoURL ? (
                <Avatar
                  alt={user.displayName!}
                  src={user.photoURL}
                  sx={{ width: 40, height: 40, margin: "0 auto" }}
                />
              ) : (
                <img src={app.icon} alt={app.name} width={40} height={40} />
              )}
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontSize: "0.87rem",
                  fontWeight: 400,
                  letterSpacing: "-0.5px",
                }}
              >
                {app.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Menu>
    </>
  );
}
