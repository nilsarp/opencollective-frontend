import { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { themeGet } from 'styled-system';

import { Flex } from '@rebass/grid';
import Container from '../components/Container';
import Page from '../components/Page';
import { H3, P } from '../components/Text';
import { PaperPlane } from 'styled-icons/boxicons-regular/PaperPlane';

const Icon = styled(PaperPlane)`
  color: ${themeGet('colors.primary.300')};
`;

class ConfirmCollectiveDeletion extends Component {
  static async getInitialProps({ res, query = {}, router }) {
    if (query.type) {
      return { type: query.type };
    }

    if (res) {
      res.statusCode = 302;
      res.setHeader('Location', '/home');
      res.end();
    } else {
      router.pushRoute('home');
    }
    return {};
  }

  render() {
    const { type } = this.props;

    return (
      <Page title="Deletion Confirmation">
        <Container pt={4} pb={6} px={2} background="linear-gradient(180deg, #EBF4FF, #FFFFFF)" textAlign="center">
          <Flex justifyContent="center" mb={4}>
            <Icon size="60" />
          </Flex>
          <H3 as="h1" fontWeight="800">
            Your {type === 'USER' ? 'account' : 'collective'} has been deleted.
          </H3>
          {type === 'USER' ? (
            <P fontSize="LeadParagraph" lineHeight="LeadParagraph" color="black.900" mt={4}>
              We&apos;ve deleted your account, memberships, expenses, payment methods and all connected accounts.
            </P>
          ) : (
            <P fontSize="LeadParagraph" lineHeight="LeadParagraph" color="black.900" mt={4}>
              We&apos;ve deleted your collective, expenses, members, tiers and all related entities relating to this
              collective.
            </P>
          )}
        </Container>
      </Page>
    );
  }
}

ConfirmCollectiveDeletion.propTypes = {
  type: PropTypes.string.isRequired,
};

export default ConfirmCollectiveDeletion;
