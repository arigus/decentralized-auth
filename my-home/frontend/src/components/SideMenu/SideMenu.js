import React from 'react';
import { Link } from 'react-router-dom';
import Paper from 'material-ui/Paper';
import { List, ListItem } from 'material-ui/List';
import Divider from 'material-ui/Divider';
import IconActionHome from 'material-ui/svg-icons/action/home';

const SideMenu = () => {
  const style = {
    height: '100%',
    margin: 20,
  };
  return (
    <div>
      <Paper style={style} id="navigation-menu">
        <Divider />
        <List>
          <Link to="/my-devices">
            <ListItem primaryText="My Devices" leftIcon={<IconActionHome />} />
          </Link>
          <Link to="/my-policies">
            <ListItem primaryText="My Policies" leftIcon={<IconActionHome />} />
          </Link>
        </List>
      </Paper>
    </div>
  );
};

export default SideMenu;
