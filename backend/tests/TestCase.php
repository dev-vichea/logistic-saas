<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use LogicException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $connection = $app->make('db')->connection();

        if (! $app->environment('testing') || $connection->getDriverName() !== 'pgsql' || ! str_ends_with($connection->getDatabaseName(), '_test')) {
            throw new LogicException(sprintf('Tests require APP_ENV=testing and a PostgreSQL database ending in _test; received %s / %s / %s. No migrations were run.', $app->environment(), $connection->getDriverName(), $connection->getDatabaseName()));
        }

        return $app;
    }
}
