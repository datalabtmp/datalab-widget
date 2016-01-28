/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React, { Component, PropTypes } from 'react';
import s from './ContactPage.scss';
import withStyles from '../../decorators/withStyles';
import Button from 'react-bootstrap/lib/Button';

const title = 'Contact Us';

@withStyles(s)
class ContactPage extends Component {

  static contextTypes = {
    onSetTitle: PropTypes.func.isRequired,
  };

  componentDidMount(){
    var playerInstance = jwplayer("myElement");
    playerInstance.setup({
        file: "//example.com/uploads/myVideo.mp4",
        image: "//example.com/uploads/myPoster.jpg",
        width: 640,
        height: 360,
        title: 'Basic Video Embed',
        description: 'A video with a basic title and description!',
        mediaid: '123456'
    });
  }

  componentWillMount() {
    this.context.onSetTitle(title);
  }

  render() {
    return (
      <div className={s.root}>
        <div className={s.container}>
          <h1>{title}</h1>
          <div id="myElement"></div>
          <p><Button bsSize="large">Success</Button></p>
        </div>
      </div>
    );
  }

}

export default ContactPage;
